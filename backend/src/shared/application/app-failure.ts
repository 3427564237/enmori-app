export const APP_FAILURE_CATALOGUE = {
  PROFILE_INVALID: {
    statusCode: 422,
    message: "Use a display name of 1–50 characters or leave it unset, and choose a valid Profile visibility.",
  },
  PROFILE_REVISION_PRECONDITION_FAILED: {
    statusCode: 412,
    message: "Your profile changed. Reload it before saving again.",
  },
  SETTINGS_INVALID: {
    statusCode: 422,
    message: "Choose valid privacy and data-use settings.",
  },
  SETTINGS_REVISION_PRECONDITION_FAILED: {
    statusCode: 412,
    message: "Your settings changed. Reload them before saving again.",
  },
  REQUEST_INVALID: {
    statusCode: 400,
    message: "Request parameters are invalid.",
  },
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
  INTEREST_SELECTION_INVALID: {
    statusCode: 422,
    message: "Choose up to 10 available interests and try again.",
  },
  INTEREST_REVISION_PRECONDITION_FAILED: {
    statusCode: 412,
    message: "Your interests changed. Reload them before saving again.",
  },
  IDEMPOTENCY_KEY_INVALID: {
    statusCode: 400,
    message: "Provide a valid request key and try again.",
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
