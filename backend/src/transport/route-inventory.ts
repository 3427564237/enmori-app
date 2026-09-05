export const ROUTE_INVENTORY = [
  {
    method: "PUT",
    path: "/v1/me/onboarding",
    successStatuses: [200, 201],
  },
  {
    method: "GET",
    path: "/v1/me/onboarding",
    successStatuses: [200],
  },
  {
    method: "POST",
    path: "/v1/check-ins",
    successStatuses: [200, 201],
  },
  {
    method: "GET",
    path: "/v1/check-ins/{checkInId}",
    successStatuses: [200],
  },
] as const;
