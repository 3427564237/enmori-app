package com.enmori.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.CalendarContract
import java.net.URI

/** Foreground, user-triggered OS handoff. No Calendar Provider writes. */
internal object EventActions {
    private fun text(value: Any?, max: Int): String? {
        val s = value as? String ?: return null
        if (s.isBlank() || s.codePointCount(0, s.length) > max ||
            Regex("[\\p{Cc}\\p{Cs}\\u202a-\\u202e\\u2066-\\u2069<>]|```").containsMatchIn(s)) return null
        return s
    }

    fun intent(method: String, args: Map<*, *>): Intent? {
        return when (method) {
            "openSourceAddress" -> {
                if (args.keys != setOf("address", "countryCode") || args["countryCode"] != "SG") return null
                val address = text(args["address"], 200) ?: return null
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode("$address, Singapore")}"))
            }
            "openMap" -> {
                if (args.keys.any { it !in setOf("street", "street2", "city", "postalCode", "countryCode") }) return null
                val street = text(args["street"], 200) ?: return null
                val city = text(args["city"], 100) ?: return null
                val postal = args["postalCode"] as? String ?: return null
                if (!postal.matches(Regex("^[0-9]{6}$")) || args["countryCode"] != "SG") return null
                val street2 = if (args.containsKey("street2")) text(args["street2"], 200) ?: return null else null
                val address = listOfNotNull(street, street2, city, postal, "SG").joinToString(", ")
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=${Uri.encode(address)}"))
            }
            "editCalendar" -> {
                if (args.keys.any { it !in setOf("title", "startMillis", "endMillis", "location", "url") }) return null
                val title = text(args["title"], 200) ?: return null
                val start = integer(args["startMillis"]) ?: return null
                val end = if (args.containsKey("endMillis")) integer(args["endMillis"]) ?: return null else null
                if (end != null && end <= start) return null
                val location = if (args.containsKey("location")) text(args["location"], 600) ?: return null else null
                val url = text(args["url"], 2048) ?: return null
                val uri = URI(url)
                if (uri.scheme != "https" || uri.host !in setOf("ticketmaster.sg", "www.ticketmaster.sg", "www1.ticketmaster.sg", "www.onepa.gov.sg") ||
                    uri.rawUserInfo != null || uri.rawFragment != null || uri.port !in setOf(-1, 443)) return null
                if (Uri.parse(url).queryParameterNames.any {
                    Regex("^(api[_-]?key|token|access_token|secret|password|authorization)$", RegexOption.IGNORE_CASE).matches(it)
                }) return null
                Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI).apply {
                    putExtra(CalendarContract.Events.TITLE, title)
                    putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
                    if (end != null) putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end)
                    if (location != null) putExtra(CalendarContract.Events.EVENT_LOCATION, location)
                    putExtra(CalendarContract.Events.DESCRIPTION, url)
                }
            }
            else -> null
        }
    }

    private fun integer(value: Any?): Long? = when (value) {
        is Long -> value
        is Int -> value.toLong()
        else -> null
    }?.takeIf { it >= 0 && it <= 253402300799999L }

    fun open(activity: Activity, method: String, arguments: Any?): Boolean {
        if (activity.isFinishing || activity.isDestroyed || !activity.hasWindowFocus()) return false
        return try {
            val args = arguments as? Map<*, *> ?: return false
            val intent = intent(method, args) ?: return false
            activity.startActivity(intent)
            true // Handoff, not a saved calendar receipt.
        } catch (_: Exception) { false }
    }
}
