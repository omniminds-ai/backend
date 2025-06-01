import { ValidationSchema, ValidationRules } from '../../middleware/validator.ts';
import { VPSRegion } from '../../types/gym.ts';

/**
 * Schema for starting a race session
 */
export const startRaceSessionSchema: ValidationSchema = {
  address: {
    required: true,
    rules: [ValidationRules.isString(), ValidationRules.isSolanaAddress()]
  },
  region: {
    required: false,
    rules: [
      ValidationRules.isString(),
      ValidationRules.isIn(Object.values(VPSRegion), 'Must be a valid region')
    ]
  }
};

/**
 * Schema for updating a race session
 */
export const updateRaceSessionSchema: ValidationSchema = {
  status: {
    required: true,
    rules: [
      ValidationRules.isString(),
      ValidationRules.isIn(
        ['active', 'completed', 'expired'],
        'Status must be one of: active, completed, expired'
      )
    ]
  }
};

/**
 * Schema for submitting race feedback
 */
export const raceFeedbackSchema: ValidationSchema = {
  raceIdea: {
    required: true,
    rules: [
      ValidationRules.isString(),
      ValidationRules.minLength(1),
      ValidationRules.maxLength(1000)
    ]
  }
};

/**
 * Schema for requesting a hint
 */
export const hintRequestSchema: ValidationSchema = {
  screenshot: {
    required: true,
    rules: [ValidationRules.isString(), ValidationRules.minLength(1)]
  }
};

/**
 * Schema for exporting session data (query params)
 */
export const exportSessionQuerySchema: ValidationSchema = {
  sessionId: {
    required: true,
    rules: [ValidationRules.isString(), ValidationRules.minLength(1)]
  }
};

/**
 * Schema for exporting multiple sessions data
 */
export const exportSessionsSchema: ValidationSchema = {
  sessionIds: {
    required: true,
    rules: [ValidationRules.isArray(), ValidationRules.isNonEmptyArray()]
  }
};
