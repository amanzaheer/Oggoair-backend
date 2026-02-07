/**
 * Simple in-memory rate limiter per user
 * For production at scale, consider Redis-based rate limiting (e.g. express-rate-limit with Redis store)
 */

const inviteLimitMap = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 10;

const cleanup = () => {
  const now = Date.now();
  for (const [key, data] of inviteLimitMap.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      inviteLimitMap.delete(key);
    }
  }
};

// Run cleanup every 15 minutes
setInterval(cleanup, 15 * 60 * 1000);

/**
 * Rate limit referral invite requests per user
 */
const referralInviteRateLimiter = (req, res, next) => {
  const userId = req.user?._id?.toString();
  if (!userId) {
    return next();
  }

  const now = Date.now();
  let data = inviteLimitMap.get(userId);

  if (!data) {
    inviteLimitMap.set(userId, { count: 1, windowStart: now });
    return next();
  }

  if (now - data.windowStart > WINDOW_MS) {
    data.count = 1;
    data.windowStart = now;
    return next();
  }

  data.count += 1;

  if (data.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      status: 'error',
      message: 'Too many invite requests. Please try again later.'
    });
  }

  next();
};

module.exports = { referralInviteRateLimiter };
