export const APP_FAILURE_CATALOGUE = {
  AUTH_REQUIRED: {
    statusCode: 401,
    message: "Your session has expired. Sign in again.",
  },
  AUTH_FORBIDDEN: {
    statusCode: 403,
    message: "This account cannot continue.",
  },
  USERNAME_INVALID: {
    statusCode: 400,
    message: "Enter a valid Username using the format shown.",
  },
  USERNAME_UNAVAILABLE: {
    statusCode: 409,
    message: "This Username is unavailable.",
  },
  ONBOARDING_REQUIRED: {
    statusCode: 409,
    message: "Finish setting up your ENMORI account.",
  },
  ONBOARDING_CONFLICT: {
    statusCode: 409,
    message: "Account setup could not be completed with these details.",
  },
  CHECKIN_INVALID: {
    statusCode: 400,
    message: "Check-in details are invalid.",
  },
  CHECKIN_UNAVAILABLE: {
    statusCode: 404,
    message: "This Check-in is unavailable.",
  },
  IDEMPOTENCY_CONFLICT: {
    statusCode: 409,
    message: "This request conflicts with an earlier operation.",
  },
  SERVICE_UNAVAILABLE: {
    statusCode: 503,
    message: "This service is temporarily unavailable. Try again.",
  },
} as const;

export type AppFailureCode = keyof typeof APP_FAILURE_CATALOGUE;

export interface AppFailure {
  readonly code: AppFailureCode;
  readonly message: string;
}

export function appFailure(code: AppFailureCode): AppFailure {
  return {
    code,
    message: APP_FAILURE_CATALOGUE[code].message,
  };
}
