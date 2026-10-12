package com.enmori.app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.enmori.app/time_zone")
            .setMethodCallHandler { call, result ->
                if (call.method == "ianaTimeZone") {
                    val zone = ZoneId.systemDefault().id
                    if (isApprovedIanaZone(zone)) result.success(zone)
                    else result.error("ZONE_UNAVAILABLE", "Device IANA time zone is unavailable.", null)
                } else if (call.method == "currentDate") {
                    val zone = call.argument<String>("timeZone")
                    if (zone == null || !isApprovedIanaZone(zone)) {
                        result.error("ZONE_INVALID", "The captured device time zone is invalid.", null)
                    } else {
                        result.success(LocalDate.now(ZoneId.of(zone)).toString())
                    }
                } else if (call.method == "formatInstants") {
                    val zone = call.argument<String>("timeZone")
                    val instants = call.argument<List<String>>("instants")
                    if (zone == null || !isApprovedIanaZone(zone) || instants == null) {
                        result.error("FORMAT_INVALID", "Check-in times could not be formatted.", null)
                    } else {
                        val formatter = DateTimeFormatter.ofPattern("EEE, d MMM · HH:mm", Locale.ENGLISH)
                        result.success(instants.map { Instant.parse(it).atZone(ZoneId.of(zone)).format(formatter) })
                    }
                } else {
                    result.notImplemented()
                }
            }
    }

    private fun isApprovedIanaZone(zone: String): Boolean {
        val rejectedAbbreviations = setOf("CET", "EET", "EST", "GMT", "HST", "MET", "MST", "WET")
        return zone in ZoneId.getAvailableZoneIds() &&
            !zone.matches(Regex("^[+-]\\d{2}:?\\d{2}$")) &&
            zone !in rejectedAbbreviations
    }
}
