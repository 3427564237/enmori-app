package com.enmori.app

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

