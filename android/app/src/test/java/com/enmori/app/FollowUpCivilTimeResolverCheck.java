package com.enmori.app;

import java.util.List;
import java.util.Map;

/** Dependency-free JVM check of the native resolver. This is not device proof.
 * Compile together with the production Java file, then run this main class. */
public final class FollowUpCivilTimeResolverCheck {
    public static void main(String[] args) {
        List<Map<String, String>> singapore = FollowUpCivilTimeResolver.resolve("Asia/Singapore", 2026, 10, 25, 15, 30);
        check(singapore.size() == 1 && singapore.get(0).get("dueAt").equals("2026-10-25T07:30:00Z"));
        check(singapore.get(0).get("timeZone").equals("Asia/Singapore")
                && singapore.get(0).get("displayTime").equals("2026-10-25 15:30")
                && singapore.get(0).get("offsetLabel").equals("UTC+08:00"));
        check(FollowUpCivilTimeResolver.resolve("America/New_York", 2026, 3, 8, 2, 30).isEmpty());
        List<Map<String, String>> fold = FollowUpCivilTimeResolver.resolve("America/New_York", 2026, 11, 1, 1, 30);
        check(fold.size() == 2 && fold.get(0).get("dueAt").equals("2026-11-01T05:30:00Z")
                && fold.get(1).get("dueAt").equals("2026-11-01T06:30:00Z"));
        check(fold.get(0).get("offsetLabel").equals("UTC-04:00")
                && fold.get(1).get("offsetLabel").equals("UTC-05:00"));
        List<Map<String, String>> halfHour = FollowUpCivilTimeResolver.resolve("Australia/Lord_Howe", 2026, 4, 5, 1, 45);
        check(halfHour.size() == 2 && halfHour.get(0).get("dueAt").equals("2026-04-04T14:45:00Z")
                && halfHour.get(1).get("dueAt").equals("2026-04-04T15:15:00Z"));
        check(FollowUpCivilTimeResolver.resolve("Pacific/Apia", 2011, 12, 30, 12, 0).isEmpty());
        check(FollowUpCivilTimeResolver.resolve("UTC", 2026, 10, 25, 12, 0).get(0).get("offsetLabel").equals("UTC+00:00"));
        rejects(() -> FollowUpCivilTimeResolver.resolve("Asia/Singapore", 2026, 2, 29, 12, 0));
        rejects(() -> FollowUpCivilTimeResolver.resolve("Asia/Singapore", 2026, 10, 25, 24, 0));
        rejects(() -> FollowUpCivilTimeResolver.resolve("Unknown/Place", 2026, 10, 25, 12, 0));
        rejects(() -> FollowUpCivilTimeResolver.resolve("+08:00", 2026, 10, 25, 12, 0));
        rejects(() -> FollowUpCivilTimeResolver.resolve("CST", 2026, 10, 25, 12, 0));
        rejects(() -> FollowUpCivilTimeResolver.resolve("Asia/Singapore", 10000, 1, 1, 12, 0));
        System.out.println("PASS: Singapore, gap, overlap, half-hour overlap, skipped date, UTC, invalid inputs");
    }

    private static void check(boolean condition) {
        if (!condition) throw new AssertionError("Civil time expectation failed");
    }

    private static void rejects(Runnable action) {
        try { action.run(); } catch (IllegalArgumentException | java.time.DateTimeException expected) { return; }
        throw new AssertionError("Invalid civil time was accepted");
    }
}
