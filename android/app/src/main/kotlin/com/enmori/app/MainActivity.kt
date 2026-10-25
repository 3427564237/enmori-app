package com.enmori.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import java.net.URI
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.enmori.app/preferences")
            .setMethodCallHandler { call, result ->
                try {
                    val preferences = getSharedPreferences("enmori_device_preferences", MODE_PRIVATE)
                    when (call.method) {
                        "readLanguage" -> result.success(preferences.getString("app_language", null))
                        "writeLanguage" -> {
                            val language = call.argument<String>("language")
                            if (language != "en" && language != "zh") {
                                result.error("LANGUAGE_INVALID", "Unsupported interface language.", null)
                            } else {
                                // Acknowledgement follows the durable write, not an optimistic UI change.
                                result.success(preferences.edit().putString("app_language", language).commit())
                            }
                        }
                        else -> result.notImplemented()
                    }
                } catch (_: Exception) {
                    result.error("LANGUAGE_UNAVAILABLE", "Device language is unavailable.", null)
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.enmori.app/external_activity")
            .setMethodCallHandler { call, result ->
                if (call.method != "open" && call.method != "openAttribution") {
                    result.notImplemented()
                } else {
                    val url = call.argument<String>("url")
                    result.success(openActivitySource(url, call.method == "openAttribution"))
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.enmori.app/time_zone")
            .setMethodCallHandler { call, result ->
                if (call.method == "ianaTimeZone") {
                    val zone = TimeZone.getDefault().id
                    if (isApprovedIanaZone(zone)) result.success(zone)
                    else result.error("ZONE_UNAVAILABLE", "Device IANA time zone is unavailable.", null)
                } else if (call.method == "currentDate") {
                    val zone = call.argument<String>("timeZone")
                    if (zone == null || !isApprovedIanaZone(zone)) {
                        result.error("ZONE_INVALID", "The captured device time zone is invalid.", null)
                    } else {
                        result.success(format("yyyy-MM-dd", zone, Date()))
                    }
                } else if (call.method == "resolveCivil") {
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        result.error("TIME_UNAVAILABLE", "Civil time resolution is unavailable.", null)
                    } else {
                        try {
                            result.success(FollowUpCivilTimeResolver.resolve(
                                requireNotNull(call.argument<String>("timeZone")),
                                requireNotNull(call.argument<Int>("year")),
                                requireNotNull(call.argument<Int>("month")),
                                requireNotNull(call.argument<Int>("day")),
                                requireNotNull(call.argument<Int>("hour")),
                                requireNotNull(call.argument<Int>("minute")),
                            ))
                        } catch (_: Exception) {
                            result.error("TIME_INVALID", "Civil time or IANA zone is invalid.", null)
                        }
                    }
                } else if (call.method == "formatInstants") {
                    val zone = call.argument<String>("timeZone")
                    val instants = call.argument<List<String>>("instants")
                    if (zone == null || !isApprovedIanaZone(zone) || instants == null) {
                        result.error("FORMAT_INVALID", "Check-in times could not be formatted.", null)
                    } else {
                        val dates = instants.mapNotNull(::parseInstant)
                        if (dates.size != instants.size) {
                            result.error("FORMAT_INVALID", "A check-in time is invalid.", null)
                        } else {
                            result.success(dates.map { format("EEE, d MMM '·' HH:mm", zone, it) })
                        }
                    }
                } else {
                    result.notImplemented()
                }
            }
        // The feature calls this only after explicit push opt-in. Registering
        // the handler itself creates no channel and obtains no token.
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.enmori.app/proactive_notifications")
            .setMethodCallHandler { call, result ->
                if (call.method != "prepareChannel") {
                    result.notImplemented()
                } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                    result.success(false)
                } else {
                    try {
                        val manager = getSystemService(NotificationManager::class.java)
                        val channel = NotificationChannel(
                            "enmori_requested_followups",
                            getString(R.string.enmori_requested_followups_name),
                            NotificationManager.IMPORTANCE_DEFAULT,
                        ).apply {
                            description = getString(R.string.enmori_requested_followups_description)
                            lockscreenVisibility = Notification.VISIBILITY_PRIVATE
                            setShowBadge(false)
                        }
                        manager.createNotificationChannel(channel)
                        result.success(manager.getNotificationChannel(channel.id).importance != NotificationManager.IMPORTANCE_NONE)
                    } catch (_: Exception) {
                        result.success(false)
                    }
                }
            }
    }

    private fun openActivitySource(value: String?, attribution: Boolean = false): Boolean {
        if (value == null || value.length > 2048 || isFinishing || isDestroyed || !hasWindowFocus()) return false
        return try {
            if (Regex("[\\s\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]").containsMatchIn(value)) return false
            val url = URI(value)
            if (url.scheme != "https" ||
                url.host?.lowercase(Locale.ROOT) !in (if (attribution) setOf("open-meteo.com", "creativecommons.org", "www.openstreetmap.org") else setOf("ticketmaster.sg", "www.ticketmaster.sg")) ||
                url.rawUserInfo != null || url.rawFragment != null || url.port !in setOf(-1, 443)) return false
            val nativeUri = Uri.parse(value)
            if (nativeUri.queryParameterNames.any {
                Regex("^(api[_-]?key|token|access_token|secret|password|authorization)$", RegexOption.IGNORE_CASE).matches(it)
            }) return false
            val intent = Intent(Intent.ACTION_VIEW, nativeUri).apply {
                // Select a browser, including when another app owns a verified link.
                selector = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_BROWSER)
                addCategory(Intent.CATEGORY_BROWSABLE)
            }
            startActivity(intent)
            true // OS handoff only; never a registration or participation receipt.
        } catch (_: Exception) {
            false // Do not log content, URLs or platform exception messages.
        }
    }

    private fun isApprovedIanaZone(zone: String): Boolean {
        return zone in TimeZone.getAvailableIDs() &&
            !zone.matches(Regex("^[+-]\\d{2}:?\\d{2}$")) &&
            zone !in rejectedTimeZoneAbbreviations
    }

    private fun format(pattern: String, zone: String, date: Date): String =
        SimpleDateFormat(pattern, Locale.ENGLISH).apply {
            timeZone = TimeZone.getTimeZone(zone)
            isLenient = false
        }.format(date)

    private fun parseInstant(value: String): Date? {
        for (pattern in instantPatterns) {
            val parser = SimpleDateFormat(pattern, Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
                isLenient = false
            }
            val position = ParsePosition(0)
            val parsed = parser.parse(value, position)
            if (parsed != null && position.index == value.length) return parsed
        }
        return null
    }

    private companion object {
        val rejectedTimeZoneAbbreviations = setOf("CET", "EET", "EST", "GMT", "HST", "MET", "MST", "WET")
        val instantPatterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSX",
            "yyyy-MM-dd'T'HH:mm:ssX",
        )
    }
}
