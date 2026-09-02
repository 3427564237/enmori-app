# Production Weather contract — 2026-09-02

- **Status:** Approved; Q13-A through Q13-D approved; Q-13 Resolved
- **Decision owner:** LI HOURUI, ENMORI PM
- **Source ID:** S-PM-0902-Q13
- **Approved scope:** Provider/trust/privacy/attribution, lookup/validation/failure, versioned projection/lifecycle/AI boundary, display/fallback, exclusions, and evidence
- **Builds on:** [S-PM-0831](2026-08-31-pm-requirements-decisions.md), [S-PM-0901-BACKEND](2026-09-01-backend-architecture.md), and [S-PM-0901-Q17](2026-09-01-recommendation-ai-field-allowlists.md)
- **External provider evidence reviewed:** [Open-Meteo Forecast API](https://open-meteo.com/en/docs), [Terms & Privacy](https://open-meteo.com/en/terms), and [Licence](https://open-meteo.com/en/licence), reviewed 2026-09-02

## Q13-A — Provider and trust boundary

The controlled non-commercial Week 9 Release uses the Open-Meteo Forecast API as its sole Weather provider.

This approval is limited to the educational/non-commercial deployment while it remains compliant with the provider's then-current terms, attribution requirements, and Free API limits. Commercial deployment, a different provider, self-hosting, or incompatible changed terms require a new review.

Flutter never calls Open-Meteo directly. It requests optional Weather enrichment through the trusted Backend; only the Backend Weather Adapter communicates with the provider.

Provider failure, terms/limit protection, invalid response, or missing permitted Approx Location causes Weather enrichment to be skipped and never blocks Check-in creation.

## Approx Location boundary

Weather lookup requires an explicitly permitted approximate coordinate supplied for the current Check-in operation.

Flutter quantizes the permitted coordinate to the nearest `0.1°` latitude/longitude grid before transmission. Backend validates and canonicalizes the same grid before provider use. A value outside coordinate range or not conforming to the approved approximate grid is not used for Weather lookup.

No precise coordinate, background location stream, continuous tracking, address, place history, IP-derived location, or reverse-geocoded identity is used for Weather.

If permitted Approx Location is absent, Weather lookup is skipped. Backend does not infer location from IP address, profile data, previous Check-ins, or another user's record.

## Third-party processing boundary

Use of the Free Open-Meteo API necessarily discloses the canonical Approx Location to Open-Meteo as an external provider. Open-Meteo may process and temporarily retain provider-side request metadata according to its then-current terms, including geographic coordinates in server logs.

ENMORI does not send the user's device IP address as application data. The provider observes the normal network metadata of the Backend request, which ordinarily exposes the Backend's network egress rather than the Flutter device's direct network connection.

This external processing must be represented accurately in the applicable privacy notice. ENMORI must not claim that Approx Location remains entirely within ENMORI infrastructure.

## Provider request and response boundary

The provider request contains only the canonical Approx Location, the minimum current-condition variable request, and non-identifying protocol parameters.

UID, Check-in ID, Note, Mood, Activity, Persona, device identifier, authorization token, ENMORI correlation ID, and other product data never enter the provider request.

Provider response is untrusted Infrastructure input. Backend validates it and maps approved values to an internal Weather projection. Raw provider payload, returned coordinates, model metadata, provider generation timing, and unapproved provider-specific fields are not returned to Flutter, persisted with the Check-in, sent to Qwen, or logged.

Open-Meteo has no Firebase, Firestore, or product authority. It cannot create/update a Check-in or decide whether Weather is saved.

## Mandatory attribution

Required attribution must satisfy Open-Meteo's then-current licence requirements wherever Open-Meteo Weather data are displayed, including the required Open-Meteo attribution/link and any applicable CC BY 4.0 notice requirements.

The approved attribution label is `Weather data by Open-Meteo`. Q-04 controls only compliant visual placement and presentation treatment; it cannot remove, weaken, or make required attribution optional.

## Q13-B — Lookup timing, variables, and failure

Backend captures one server-authoritative `weatherAsOf` after Check-in authentication, authorization, Note-or-Mood validation, consent, and Approx Location validation succeed.

At most one Open-Meteo request is attempted for one logical Check-in creation. There is no automatic provider retry, background lookup, or later Weather backfill in the MVP.

Weather lookup has one monotonic two-second deadline covering connection, provider response, raw parsing, and response validation. It does not pause or restart between stages. Check-in creation waits for this optional sub-operation for at most two seconds.

Timeout triggers best-effort cancellation. A late provider response is discarded and cannot update the Check-in later.

### Minimum provider request

The request asks only for current `temperature_2m` in Celsius and current WMO `weather_code` at the Q13-A canonical Approx Location.

The request explicitly selects `timeformat=unixtime`. The Weather Adapter does not rely on the provider's default timezone. Epoch seconds are interpreted as UTC/GMT+0 for freshness validation.

Forecast arrays, historical Weather, daily forecast, humidity, wind, precipitation amount/probability, air quality, alerts, and geocoding are not requested.

### Untrusted response validation

Backend accepts one current-condition object only. The provider timestamp must represent a UTC condition no more than 30 minutes before `weatherAsOf` and no more than 15 minutes after it.

Backend validates the provider-declared units for every accepted current-condition field. `temperature_2m` must be declared as Celsius, and `weather_code` must use the expected WMO-code representation. Missing or incompatible unit metadata invalidates the Weather response as a whole. Exact provider unit tokens remain adapter-level constants implementing these semantic requirements.

Temperature must be finite and within `-100°C...70°C`. Weather code must be an approved WMO current-condition code. Unknown code, missing field, unexpected type, non-finite temperature, incompatible/missing unit metadata, or out-of-window time invalidates the whole Weather response.

### Non-blocking failure

Missing/invalid Approx Location, local provider-rate protection, two-second timeout, network/DNS/TLS failure, non-success provider response, malformed JSON, schema mismatch, invalid value, or provider terms/availability protection all produce the same product-level outcome: Check-in creation continues without Weather.

Weather failure does not remove an otherwise permitted Approx Location, change Note/Mood validation, or authorize a later asynchronous Weather mutation.

If Check-in persistence itself fails, the Check-in operation fails under its normal persistence contract; Weather success cannot convert a failed Check-in into a partial standalone Weather record.

A successful provider response remains an in-memory candidate projection until the Check-in and approved Weather projection are persisted together. Raw provider data is discarded on both success and failure paths.

## Q13-C — Projection, persistence, and lifecycle

The only persisted Weather semantic projection is:

```text
WeatherProjection v1
├── projectionVersion: weather_projection_v1
├── source: open_meteo
├── observedAt: validated UTC instant
├── temperatureCelsius: one decimal place
└── condition:
    clear
    partly_cloudy
    overcast
    fog
    drizzle
    rain
    snow
    showers
    thunderstorm
```

Validated Celsius values are normalized to the nearest `0.1°C` using decimal arithmetic. Exact halfway cases are rounded away from zero. Binary floating-point rounding does not determine the authoritative normalized value. The physical numeric representation remains a schema decision.

`source` and `projectionVersion` are non-user-content provenance needed for correct attribution and historical presentation. They do not enter Qwen. Raw WMO code, provider-returned coordinate/elevation, raw units, timezone metadata, model identity, generation time, and complete response are not persisted.

### Versioned WMO normalization

| WMO codes | Normalized condition |
|---|---|
| `0` | `clear` |
| `1, 2` | `partly_cloudy` |
| `3` | `overcast` |
| `45, 48` | `fog` |
| `51, 53, 55, 56, 57` | `drizzle` |
| `61, 63, 65, 66, 67` | `rain` |
| `71, 73, 75, 77, 85, 86` | `snow` |
| `80, 81, 82` | `showers` |
| `95, 96, 99` | `thunderstorm` |

An unlisted code invalidates the complete Weather response. The Backend owns the mapping; provider wording does not enter product data directly.

`weather_projection_v1` freezes the Q13-C field semantics, temperature-normalization rule, and WMO-to-condition mapping. Any incompatible field, normalization, or mapping change requires a new projection version. Existing persisted projections retain their original condition and temperature and are not retrospectively remapped or rewritten.

### Check-in ownership and privacy

WeatherProjection has no independent product identity, owner, privacy state, or lifecycle. It is optional and linked to exactly one Check-in, persisted atomically with that Check-in. Failed Check-in persistence leaves no standalone Weather record.

Weather inherits the Check-in's owner, visibility, and purpose authorization. It cannot be more public than the Check-in, and Admin has no separate Weather access. Changing Check-in visibility changes Weather visibility through the same authority check; no Weather copy is created for feeds, Calendar, Footprint, or AI.

Permanent Check-in deletion removes its WeatherProjection in the same deletion operation. Removing the Check-in's permitted Approx Location or withdrawing applicable Weather/location-purpose permission removes the WeatherProjection without deleting the Check-in, Note, Mood, Activity, or a separately permitted Approx Location.

There is no Weather edit, manual override, independent delete, restore, history, or provider refresh in the MVP.

### Authorization withdrawal race

Before or within atomic Check-in persistence, Backend revalidates that authoritative Weather/location-purpose permission remains valid. Revalidation and Weather attachment use a race-safe consistency boundary.

If permission or applicable Approx Location authority is withdrawn while lookup is in flight, the stale Weather candidate is discarded. It cannot be persisted, delivered later, or recreate Weather after withdrawal. The otherwise valid Check-in continues and is persisted without Weather.

### Qwen projection

Q17 Check-in assistance may receive only one fixed safe English label derived from the normalized condition: `Clear`, `Partly cloudy`, `Overcast`, `Fog`, `Drizzle`, `Rain`, `Snow`, `Showers`, or `Thunderstorm`.

Temperature, observed time, source, projection version, coordinate, and Weather object never enter Qwen. If WeatherProjection is absent or later removed, `weatherConditionLabel` is omitted; no unknown/default Weather label is fabricated.

## Q13-D — Display, fallback, exclusions, and evidence

### Weather display and frozen attribution targets

A persisted `weather_projection_v1` is displayed as:

```text
<Condition label> · <temperature with exactly one decimal>°C
```

For example: `Partly cloudy · 22.3°C`.

The nine Q13-C English labels are authoritative for v1. UI does not reinterpret the WMO code or provider wording.

Wherever Open-Meteo Weather data are displayed, the deterministic application UI provides:

- linked attribution label `Weather data by Open-Meteo`, targeting the frozen canonical Open-Meteo destination `https://open-meteo.com/`;
- a `CC BY 4.0` licence link targeting the frozen canonical Creative Commons destination `https://creativecommons.org/licenses/by/4.0/`; and
- modification notice `Conditions normalized by ENMORI.`

These destinations are verified against the then-current canonical provider/licence targets before Release acceptance. If a target or requirement changes incompatibly, the contract must be reviewed rather than silently redirected or omitted.

Q-04 controls layout, typography, and interaction treatment only. It cannot hide, weaken, make optional, or separate the notices from displayed Weather in a way that defeats the applicable licence.

### Attribution for Weather-derived Q17 output

The attribution contract also applies to any user-facing Q17 assistant output that materially communicates, paraphrases, or relies on `weatherConditionLabel`.

Attribution is deterministic application UI attached by Backend/UI contract; it is never generated, rewritten, or selected by Qwen. If the system cannot guarantee compliant attribution for Weather-derived assistant output, that output must not be exposed as Weather-derived content. Where use of the label is uncertain, the safe choices are to attach the required attribution or omit Weather-derived output.

### Weather-enrichment fallback predicate

If no permitted Approx Location was supplied and Weather enrichment was therefore not applicable, Check-in succeeds normally with no Weather component or Weather-error copy.

If Weather enrichment was applicable but produced no persisted projection, the successful creation response uses the transient notice `Check-in saved without weather.` This predicate covers both attempted provider calls and zero-provider-request protection paths, including local rate protection, terms/limit protection, validation gates, timeout, provider failure, and concurrent permission withdrawal.

The notice is application state, not a persisted Weather placeholder, assistant message, or Check-in content. Later reads simply omit Weather; they do not show `Unknown`, stale Weather, provider errors, or a Weather retry control. Later permission-driven removal leaves no unavailable tombstone.

### Explicit exclusions

The MVP includes no:

- manual Weather entry or correction;
- Fahrenheit or unit preference;
- forecast, historical Weather, alert, air-quality, humidity, wind, or precipitation feature;
- cached grid Weather, shared Weather record, or lookup reuse between users/Check-ins;
- automatic retry, fallback provider, background refresh, or later backfill;
- standalone Weather screen, history, map, or independent Weather API;
- IP/profile/history-derived location;
- Weather-based Event/Friend/Friends Activity ranking;
- temperature or Weather object in Qwen;
- Weather-driven health, safety, or behavioural advice; or
- commercial use of the Open-Meteo Free API under this approval.

The last exclusion concerns the approved Free API service boundary and does not restate or narrow the separate CC BY 4.0 data licence.

### Mandatory Release evidence

Before Release acceptance, evidence must:

- recheck and record then-current Open-Meteo Terms, Privacy, Licence, and Free API limits;
- confirm deployment eligibility for the approved non-commercial Free API use;
- verify Android and iOS attribution, canonical Open-Meteo link, canonical CC BY 4.0 link, and modification notice wherever Weather or materially Weather-derived Q17 output is presented;
- prove the provider request contains only the canonical `0.1°` coordinate and approved minimum parameters;
- test Celsius/WMO unit metadata, exact `-30m/+15m` boundaries, all WMO mappings, decimal half-away-from-zero rounding, malformed/unknown responses, and the monotonic two-second timeout;
- test the applicable-enrichment fallback notice for both provider-attempt and zero-provider-request protection paths;
- test Check-in success without Weather for every failure class;
- test deletion, visibility change, and concurrent consent/location withdrawal;
- verify no raw response, coordinate duplicate, provider metadata, or prohibited content enters persistence, Qwen, or logs; and
- verify provider failure never makes an otherwise valid Check-in fail.

Evidence failure blocks implementation readiness and does not silently alter Q13-A through Q13-D.

## Q-13 closure

Q13-A through Q13-D resolve Q-13 at the requirement-contract level. Resolution is not proof of provider compliance, implementation, or verification and does not approve physical schema, endpoint/DTO shape, or Q-04 visual layout.

## Authority and readiness

This is a current PM Weather/provider decision, not a Sponsor/Supervisor decision and not implementation, legal-compliance, or verification evidence. Q-13 is Resolved at requirement-contract level. Provider terms must be rechecked for Release evidence; this record does not freeze an external provider's future policy.
