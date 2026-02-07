const MAX_EMAILS_PER_REQUEST = 5;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate invite request body
 * @param {string[]} emails - Array of email addresses
 * @returns {{ valid: boolean, message?: string }}
 */
const validateInviteEmails = (emails) => {
  if (!emails || !Array.isArray(emails)) {
    return { valid: false, message: 'Emails must be an array' };
  }

  if (emails.length === 0) {
    return { valid: false, message: 'At least one email is required' };
  }

  if (emails.length > MAX_EMAILS_PER_REQUEST) {
    return {
      valid: false,
      message: `Maximum ${MAX_EMAILS_PER_REQUEST} emails per request`
    };
  }

  const invalidEmails = emails.filter(
    (e) => typeof e !== 'string' || !EMAIL_REGEX.test(e.trim())
  );

  if (invalidEmails.length > 0) {
    return {
      valid: false,
      message: `Invalid email format: ${invalidEmails[0]}`
    };
  }

  return { valid: true };
};

module.exports = {
  validateInviteEmails,
  MAX_EMAILS_PER_REQUEST
};
