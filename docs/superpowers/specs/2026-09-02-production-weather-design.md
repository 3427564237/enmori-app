# Production Weather design

- **Status:** Approved PM design; Q13-A through Q13-D approved; Q-13 Resolved
- **Date:** 2026-09-02
- **Authority:** S-PM-0902-Q13
- **Implementation status:** Not implemented or verified

## Approved provider flow

```text
explicitly permitted location
  → Flutter quantizes to 0.1° grid
  → trusted Backend validates/canonicalizes
  → Backend Weather Adapter
  → Open-Meteo current conditions
  → untrusted response validation
  → approved internal Weather projection
```

Flutter has no direct provider integration. Open-Meteo receives no ENMORI identity, Check-in ID/content, device identifier, authorization token, or correlation ID.

## Trust-boundary disclosure

The canonical Approx Location crosses ENMORI's infrastructure boundary to Open-Meteo. Provider-side processing follows its then-current policy. As reviewed on 2026-09-02, the provider states that Free API webserver logs may contain geographic coordinates and are deleted after 90 days; it may also collect request IP information for maintenance/abuse prevention.

The network request originates from Backend, so ENMORI does not intentionally transmit the Flutter device IP as application data. The privacy notice must nevertheless disclose the external Approx Location processing and must not claim all location stays within ENMORI.

## Location acceptance cases

```gherkin
Given the user has not supplied permitted Approx Location for this Check-in
When optional Weather enrichment is evaluated
Then no provider request is made
And Check-in creation remains available
```

```gherkin
Given Flutter supplies a coordinate outside the approved 0.1-degree grid or valid range
When Backend validates the optional Weather input
Then that coordinate is not used for provider lookup
And Weather failure cannot make Note-or-Mood Check-in creation fail
```

## Attribution requirement

Wherever Open-Meteo Weather data are displayed, compliant attribution is mandatory. The presentation must include the Open-Meteo attribution/link and applicable CC BY 4.0 notice duties, including modification indication where applicable. Q-04 can place/style the attribution but cannot omit or weaken it.

## Approved Q13-B lookup contract

One logical Check-in creation may make at most one provider request after all local authority, required-input, consent, and Approx Location checks pass. One monotonic two-second budget covers the complete Weather attempt. No retry, background lookup, or late backfill is approved.

```text
weatherAsOf := trusted Backend instant
accepted provider time := [weatherAsOf - 30 minutes, weatherAsOf + 15 minutes]
```

The provider request explicitly selects current `temperature_2m`, current `weather_code`, Celsius, and `timeformat=unixtime`. Epoch seconds are validated as UTC/GMT+0; provider timezone defaults are not trusted.

The adapter validates the `current` values and their declared unit metadata together. Missing/incompatible Celsius or WMO-code representation invalidates the complete Weather result even when numeric values appear plausible.

```gherkin
Given temperature_2m is numeric and within the numeric range
But the provider unit metadata does not declare Celsius
When the response is validated
Then the complete Weather response is invalid
And Check-in creation continues without Weather
```

```gherkin
Given the provider time is 31 minutes before weatherAsOf
When current-condition freshness is validated
Then the Weather response is invalid
And no later backfill is scheduled
```

```gherkin
Given Weather lookup exceeds its monotonic two-second budget
When the Check-in otherwise satisfies its creation contract
Then provider cancellation is best effort
And the Check-in is created without Weather
And late Weather cannot mutate it
```

## Approved Q13-C projection and lifecycle

`weather_projection_v1` contains only source `open_meteo`, validated UTC observation time, normalized one-decimal Celsius temperature, and one of nine normalized conditions. It freezes the field semantics, decimal rounding, and WMO mapping; incompatible changes require a new version and never remap historical projections.

Temperature normalization uses decimal nearest-0.1 rounding with exact halves away from zero.

| WMO | Condition | Qwen-safe label |
|---|---|---|
| 0 | clear | Clear |
| 1, 2 | partly_cloudy | Partly cloudy |
| 3 | overcast | Overcast |
| 45, 48 | fog | Fog |
| 51, 53, 55, 56, 57 | drizzle | Drizzle |
| 61, 63, 65, 66, 67 | rain | Rain |
| 71, 73, 75, 77, 85, 86 | snow | Snow |
| 80, 81, 82 | showers | Showers |
| 95, 96, 99 | thunderstorm | Thunderstorm |

Weather is an optional Check-in-owned projection, not a standalone product entity. It inherits Check-in authority and deletion. Location/purpose withdrawal removes it and prevents stale in-flight lookup from attaching it.

```gherkin
Given a validated Celsius value is exactly halfway between two tenths
When it is normalized with decimal arithmetic
Then the result rounds away from zero
```

```gherkin
Given Weather lookup succeeds
And applicable permission is withdrawn before atomic Check-in persistence
When Backend revalidates authority
Then the Weather candidate is discarded
And the otherwise valid Check-in persists without Weather
And a late result cannot recreate Weather
```

Qwen receives only the fixed condition label inside the previously approved Q17 Check-in window. Temperature and all provenance/location/object fields remain excluded.

## Approved Q13-D presentation and fallback

Weather v1 displays the normalized condition plus exactly one decimal Celsius. Wherever Weather is shown, application-owned UI attaches the exact Open-Meteo attribution, CC BY 4.0 link, and ENMORI normalization notice using these frozen destinations:

```text
Open-Meteo: https://open-meteo.com/
CC BY 4.0:  https://creativecommons.org/licenses/by/4.0/
```

The same deterministic attribution applies to user-facing Q17 output that materially communicates, paraphrases, or relies on the Weather condition label. Qwen never generates the attribution. If compliant attribution cannot be assured, Weather-derived assistant output is withheld.

```gherkin
Given an accepted assistant response materially relies on weatherConditionLabel
When it is presented to the user
Then deterministic application UI presents the required Open-Meteo attribution, licence link, and modification notice
And Qwen is not the source of that attribution
```

Weather-enrichment applicability, rather than proof of an outbound provider call, controls transient fallback copy. Applicable enrichment with no persisted projection returns `Check-in saved without weather.`, including when local protection prevents a provider request. No permitted location means enrichment was not applicable and no Weather-error copy appears.

```gherkin
Given Weather enrichment is applicable
And local rate protection prevents any provider request
When the otherwise valid Check-in is saved
Then the transient notice is "Check-in saved without weather."
And no Weather placeholder is persisted
```

The explicit exclusions and evidence matrix in the decision record are normative. Commercial use of the Open-Meteo Free API is outside this approval; this does not redefine the CC BY 4.0 data licence.

## Closure

Q-13 is Resolved at the requirement-contract level. Implementation readiness still requires provider-term recheck, canonical-link verification, Android/iOS presentation evidence, provider contract/failure tests, lifecycle/race tests, and persistence/logging privacy evidence.
