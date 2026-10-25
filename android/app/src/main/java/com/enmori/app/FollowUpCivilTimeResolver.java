package com.enmori.app;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Android API 26+; caller guards availability. No default-zone conversion or
 * automatic gap/fold adjustment: every returned instant requires confirmation. */
public final class FollowUpCivilTimeResolver {
    private FollowUpCivilTimeResolver() {}

    public static List<Map<String, String>> resolve(
            String timeZone, int year, int month, int day, int hour, int minute) {
        if (timeZone == null || timeZone.length() > 128
                || !(timeZone.equals("UTC") || timeZone.contains("/"))
                || !ZoneId.getAvailableZoneIds().contains(timeZone)
                || year < 1 || year > 9999) {
            throw new IllegalArgumentException("Invalid civil time or IANA zone");
        }
        LocalDateTime civil = LocalDateTime.of(year, month, day, hour, minute);
        List<ZoneOffset> offsets = ZoneId.of(timeZone).getRules().getValidOffsets(civil);
        List<Map<String, String>> candidates = new ArrayList<>();
        for (ZoneOffset offset : offsets) {
            Map<String, String> candidate = new LinkedHashMap<>();
            candidate.put("dueAt", civil.toInstant(offset).toString());
            candidate.put("timeZone", timeZone);
            candidate.put("displayTime", civil.format(
                    DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm", Locale.ROOT)));
            candidate.put("offsetLabel", "UTC" + (offset.getTotalSeconds() == 0 ? "+00:00" : offset.getId()));
            candidates.add(candidate);
        }
        return candidates;
    }
}
