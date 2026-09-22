export const ROUTE_INVENTORY = [
  {
    method: "GET",
    path: "/v1/recommendations/events",
    successStatuses: [200],
    requiresIdempotencyKey: false,
  },
  {
    method: "PUT",
    path: "/v1/me/onboarding",
    successStatuses: [200, 201],
    requiresIdempotencyKey: true,
  },
  {
    method: "GET",
    path: "/v1/me/onboarding",
    successStatuses: [200],
    requiresIdempotencyKey: false,
  },
  {
    method: "POST",
    path: "/v1/check-ins",
    successStatuses: [200, 201],
    requiresIdempotencyKey: true,
  },
  {
    method: "GET",
    path: "/v1/check-ins/{checkInId}",
    successStatuses: [200],
    requiresIdempotencyKey: false,
  },
  {
    method: "GET",
    path: "/v1/interest-tags",
    successStatuses: [200],
    requiresIdempotencyKey: false,
  },
  {
    method: "GET",
    path: "/v1/me/interests",
    successStatuses: [200],
    requiresIdempotencyKey: false,
  },
  {
    method: "PUT",
    path: "/v1/me/interests",
    successStatuses: [200],
    requiresIdempotencyKey: false,
  },
] as const;
