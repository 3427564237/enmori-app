# Japan East Activity during Azure container replacement

The ordinary package for `1e3c5c085ac1a810517e671061290ac30946cbf8` was accepted and its deployment manifest matched. Kudu's active deployment status preceded the replacement container's readiness. Times are UTC. [Deployment receipt](deploy-status.json), [package readback](deployed-package-readback.json).

| Time | Observed stage |
| --- | --- |
| 09:02:40.997 | OneDeploy completed and marked the package active. |
| 09:03:20.733 | Azure started the replacement container and began startup probes. |
| 09:04:28.739 | The initial four-category operator-host batch began. |
| ~09:06:09 | The initial batch began its 30 sequential Event reads. |
| 09:08:28.979 | Replacement stdout recorded Azure entry configuration with Node 24.19.0. |
| 09:10:06.679 | Replacement stdout recorded listening after the Firebase startup probes. |
| 09:10:07.619 | Azure recorded startup-probe success after 406.62 seconds. |
| 09:10:35.160–09:10:54.115 | Azure logged termination and cleanup of the prior container. |
| 09:12:04.984 | The initial batch finished. |

The initial batch crossed container startup and replacement. It returned 16 Event successes, 12 caller timeouts, one HTTP 503 and one unsuccessful response without a parsed HTTP status or caller timeout. All 16 successes reported Ticketmaster available and onePA unavailable. The initial Event p50 was 13.141 seconds and p95 was 15.002 seconds. Ordinary categories passed their operator-host thresholds in that batch. [Initial batch samples](japaneast-latency.json).

One-minute Azure B1 plan metrics recorded 93–99% CPU between 09:06 and 09:12, 66–85% memory and reported HTTP queue length zero. CPU was already 98% at 09:05, before the synthetic Event series began. After the batch and replacement, CPU fell to 44% at 09:14 and 29% at 09:15. The app's average working set grew from 100 MiB at 09:06 to 377 MiB at 09:12. The plan also reached 90–99% CPU during the 2 November batch, whose first two Event timeouts were near that day's container transition. These observations establish a deployment-transition confounder. Aggregate plan metrics cannot assign CPU consumption or individual delays to one provider or process. [Sanitized metrics and lifecycle timestamps](azure-activity-transition-metrics.json).

At 09:15:04, after the transition and a cooldown, the same synthetic identity received its Profile response in 1.968 seconds. The following isolated Event list returned HTTP 200 in 10.845 seconds with 18 items, Ticketmaster available and onePA unavailable. These are operator-host measurements.

The startup script runs Playwright OS dependency installation and Chromium installation before invoking Node. The replacement took 308.25 seconds from container launch completion to Node's configuration line, then 97.70 seconds to listen. Those phases currently lack per-command or per-dependency timing. The Event route performs authentication and account authorization before its ten-second provider budget. The onePA list retrieval launches headed Chromium and may load up to five provider pages. Ticketmaster list retrieval uses Discovery API summaries. A stage trace could separate authentication, account authorization, each provider and response completion.

## Post-ready repeat

The same synthetic identity and pinned probe repeated the same four request series from 09:16:56.718 to 09:23:17.243. Each category contained 30 sequential complete-response reads with the same 15-second client timeout. [Post-ready samples](japaneast-post-ready-latency.json).

| Category | p50 | p95 | Failures / 30 | Target |
| --- | ---: | ---: | ---: | --- |
| Profile | 0.800 s | 1.175 s | 0 | ≤3 s met |
| Settings | 0.674 s | 0.933 s | 0 | ≤3 s met |
| Friends | 0.916 s | 1.162 s | 0 | ≤3 s met |
| Events | 11.303 s | 12.513 s | 0 | ≤12 s missed |

All 30 Event lists reported Ticketmaster available and onePA unavailable. Four Event reads exceeded 12 seconds. During the post-ready Event series, one-minute plan CPU rose from 18% at 09:18 to 98% at 09:22, with memory at 69–72% and HTTP queue length reported as zero. This shows worker load can recur after startup. The aggregate measurements and explicit provider statuses do not distinguish browser CPU, provider response times and auth delays. [Sanitized metrics](azure-activity-transition-metrics.json).

The post-ready repeat removes the startup overlap from the measurement. The Event latency target and onePA availability remain open. The timings are operator-host evidence. A rollback decision would require a reproducible regression after readiness.
