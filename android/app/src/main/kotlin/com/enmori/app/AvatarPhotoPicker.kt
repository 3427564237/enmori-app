package com.enmori.app

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ImageDecoder
import android.graphics.Paint
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.CancellationSignal
import android.provider.MediaStore
import android.util.Base64
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.DataOutputStream
import java.io.InputStream
import java.nio.ByteBuffer
import java.security.MessageDigest
import java.util.zip.CRC32
import java.util.zip.DeflaterOutputStream
import java.util.concurrent.atomic.AtomicReference

/** Explicit system selection only; no file copy, persistent grant or broad permission. */
class AvatarPhotoPicker(private val activity: Activity, messenger: BinaryMessenger) {
    private val channel = MethodChannel(messenger, "com.enmori.app/avatar")
    private val main = Handler(Looper.getMainLooper())
    private var pending: MethodChannel.Result? = null
    @Volatile private var generation = 0
    private val activeInput = AtomicReference<InputStream?>(null)
    private val activeCancellation = AtomicReference<CancellationSignal?>(null)
    private var worker: Thread? = null

    init {
        channel.setMethodCallHandler { call, result ->
            if (call.method != "pick") result.notImplemented()
            else if (pending != null) result.error("BUSY", "A photo picker is already open.", null)
            else {
                pending = result
                try {
                    val intent = if (Build.VERSION.SDK_INT >= 33) {
                        Intent(MediaStore.ACTION_PICK_IMAGES).setType("image/*")
                    } else {
                        Intent(Intent.ACTION_OPEN_DOCUMENT).setType("image/*")
                            .addCategory(Intent.CATEGORY_OPENABLE)
                    }
                    activity.startActivityForResult(intent, REQUEST)
                } catch (_: Exception) {
                    pending = null
                    result.error("UNAVAILABLE", "The photo picker could not be opened.", null)
                }
            }
        }
    }

    fun onActivityResult(request: Int, resultCode: Int, data: Intent?): Boolean {
        if (request != REQUEST) return false
        val result = pending ?: return true
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            pending = null
            result.success(null)
            return true
        }
        val epoch = generation
        worker = Thread {
            val cancellation = CancellationSignal()
            var opened: InputStream? = null
            fun current() { check(generation == epoch && !Thread.currentThread().isInterrupted) }
            try {
                current()
                activeCancellation.set(cancellation)
                current()
                require(uri.scheme == "content")
                val input = activity.contentResolver.openAssetFileDescriptor(uri, "r", cancellation)?.createInputStream()
                    ?: error("No selected image")
                opened = input
                activeInput.set(input)
                val bytes = input.use { stream ->
                    current()
                    val out = ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        current()
                        val count = stream.read(buffer)
                        if (count < 0) break
                        require(out.size() + count <= 10 * 1024 * 1024)
                        out.write(buffer, 0, count)
                    }
                    out.toByteArray()
                }
                activeInput.compareAndSet(input, null)
                current()
                val bitmap = decode(bytes)
                val png = try { current(); preview(bitmap) } finally { bitmap.recycle() }
                current()
                val hash = MessageDigest.getInstance("SHA-256").digest(png)
                    .joinToString("") { "%02x".format(it.toInt() and 255) }
                main.post {
                    if (generation == epoch && pending === result) {
                        pending = null
                        result.success(mapOf("pngBase64" to Base64.encodeToString(png, Base64.NO_WRAP),
                            "sourceSha256" to hash))
                    }
                }
            } catch (_: Exception) {
                main.post {
                    if (generation == epoch && pending === result) {
                        pending = null
                        result.error("IMAGE_INVALID", "Choose a photo under 10 MB with supported dimensions.", null)
                    }
                }
            } finally {
                opened?.let { if (activeInput.compareAndSet(it, null)) try { it.close() } catch (_: Exception) {} }
                activeCancellation.compareAndSet(cancellation, null)
            }
        }.also { it.start() }
        return true
    }

    private fun decode(bytes: ByteArray): Bitmap {
        if (Build.VERSION.SDK_INT >= 28) {
            return ImageDecoder.decodeBitmap(ImageDecoder.createSource(ByteBuffer.wrap(bytes))) { decoder, info, _ ->
                val width = info.size.width
                val height = info.size.height
                require(width > 0 && height > 0 && width.toLong() * height <= 64_000_000)
                val ratio = minOf(1.0, 768.0 / maxOf(width, height))
                decoder.setTargetSize(maxOf(1, (width * ratio).toInt()), maxOf(1, (height * ratio).toInt()))
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
                decoder.setTargetColorSpace(android.graphics.ColorSpace.get(android.graphics.ColorSpace.Named.SRGB))
            }
        }
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        require(bounds.outWidth > 0 && bounds.outHeight > 0 &&
            bounds.outWidth.toLong() * bounds.outHeight <= 64_000_000)
        var sample = 1
        while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 768) sample *= 2
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.size,
            BitmapFactory.Options().apply { inSampleSize = sample }) ?: error("Invalid image")
    }

    private fun preview(source: Bitmap): ByteArray {
        val size = 192
        val square = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        try {
            val side = minOf(source.width, source.height)
            val left = (source.width - side) / 2
            val top = (source.height - side) / 2
            val canvas = Canvas(square)
            canvas.drawColor(Color.WHITE)
            canvas.drawBitmap(source, Rect(left, top, left + side, top + side),
                Rect(0, 0, size, size), Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
            // Required PNG chunks only: no EXIF, location, names or color-profile metadata.
            val pixels = IntArray(size * size)
            square.getPixels(pixels, 0, size, 0, 0, size, size)
            val compressed = ByteArrayOutputStream()
            DeflaterOutputStream(compressed).use { deflater ->
                for (y in 0 until size) {
                    deflater.write(0)
                    for (x in 0 until size) {
                        val color = pixels[y * size + x]
                        deflater.write((color ushr 16) and 255)
                        deflater.write((color ushr 8) and 255)
                        deflater.write(color and 255)
                    }
                }
            }
            val png = ByteArrayOutputStream()
            val out = DataOutputStream(png)
            out.write(byteArrayOf(-119, 80, 78, 71, 13, 10, 26, 10))
            val header = ByteArrayOutputStream()
            DataOutputStream(header).apply { writeInt(size); writeInt(size); write(byteArrayOf(8, 2, 0, 0, 0)) }
            fun chunk(type: String, payload: ByteArray) {
                val name = type.toByteArray(Charsets.US_ASCII)
                val crc = CRC32().apply { update(name); update(payload) }
                out.writeInt(payload.size); out.write(name); out.write(payload); out.writeInt(crc.value.toInt())
            }
            chunk("IHDR", header.toByteArray())
            chunk("IDAT", compressed.toByteArray())
            chunk("IEND", byteArrayOf())
            return png.toByteArray().also { require(it.size <= 128 * 1024) }
        } finally { square.recycle() }
    }

    fun dispose() {
        generation++
        activeCancellation.getAndSet(null)?.cancel()
        activeInput.getAndSet(null)?.let { try { it.close() } catch (_: Exception) {} }
        worker?.interrupt()
        worker = null
        pending?.error("CANCELLED", "Photo selection ended.", null)
        pending = null
        channel.setMethodCallHandler(null)
    }

    companion object { private const val REQUEST = 28412 }
}
