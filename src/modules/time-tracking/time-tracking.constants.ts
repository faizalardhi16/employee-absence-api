/**
 * Konstanta domain time-tracking (audit log clock-in / clock-out).
 * SOLID: satu tempat definisi nilai-nilai domain, dipakai service & DTO.
 */
export const CLOCK_ACTION_CLOCK_IN = 'CLOCK_IN';
export const CLOCK_ACTION_CLOCK_OUT = 'CLOCK_OUT';
export const CLOCK_ACTIONS = [CLOCK_ACTION_CLOCK_IN, CLOCK_ACTION_CLOCK_OUT] as const;

export const CLOCK_OUTCOME_SUCCESS = 'SUCCESS';
export const CLOCK_OUTCOME_FAILURE = 'FAILURE';
export const CLOCK_OUTCOMES = [CLOCK_OUTCOME_SUCCESS, CLOCK_OUTCOME_FAILURE] as const;

export const SOURCE_CLIENT_TYPES = ['web', 'mobile', 'time_terminal'] as const;

export const FAILURE_REASON_INVALID_ACTION = 'invalid action type';
export const FAILURE_REASON_INVALID_SOURCE_CLIENT = 'invalid source client type';
export const FAILURE_REASON_INVALID_TIMESTAMP = 'invalid timestamp';
export const FAILURE_REASON_DUPLICATE_ACTION = 'duplicate clock action';

/** Permission yang dibutuhkan untuk membaca audit log. */
export const PERMISSION_READ_AUDIT_LOG = 'time-tracking:audit:read';