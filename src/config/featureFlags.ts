// Default to enabled (true) unless explicitly set to 'false'
const FEATURE_AUTH_ROLES = process.env.FEATURE_AUTH_ROLES !== 'false';

export default {
  FEATURE_AUTH_ROLES,
};
