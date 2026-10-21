export const APP_FAILURE_CATALOGUE = {
  EVENT_PARTICIPATION_INVALID: { statusCode: 422, message: "Choose a valid Event participation state and revision." },
  EVENT_PARTICIPATION_REVISION_PRECONDITION_FAILED: { statusCode: 412, message: "Your participation changed. Read it before saving again." },
  CATALOGUE_INVALID: { statusCode: 422, message: "Use a valid catalogue name of 1–50 characters." },
  CATALOGUE_NAME_CONFLICT: { statusCode: 409, message: "This catalogue name is already reserved." },
  PERSONA_INVALID: { statusCode: 422, message: "Use a name of 1–50 characters, valid style options and valid versions." },
  PERSONA_UNAVAILABLE: { statusCode: 404, message: "This Persona is unavailable." },
  PERSONA_LIMIT_REACHED: { statusCode: 409, message: "You can save up to 5 Personas. Delete one before creating another." },
  PERSONA_COMMAND_CONFLICT: { statusCode: 409, message: "This create request conflicts with an earlier operation. Reload before continuing." },
  PERSONA_REVISION_PRECONDITION_FAILED: { statusCode: 412, message: "Your Personas changed. Reload them before trying again." },
  ADD_FRIEND_TARGET_UNAVAILABLE: { statusCode: 404, message: "This person is unavailable." },
  FRIEND_REQUEST_UNAVAILABLE: { statusCode: 404, message: "This friend request is unavailable." },
  EVENT_UNAVAILABLE: { statusCode: 404, message: "This event is unavailable." },
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
  CHECKIN_REVISION_PRECONDITION_FAILED: { statusCode: 412, message: "This Check-in changed. Reload before saving or deleting." },
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
