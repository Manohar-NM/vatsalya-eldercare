const { rateLimit } = require("express-rate-limit");

/**
 * Creates standardized rate limiters for Vatsalya API endpoints.
 * Returns standard HTTP 429 status code with standard RateLimit-* headers
 * and a safe, non-sensitive JSON error response.
 */
function createRateLimiter({
  windowMs,
  limitFn,
  defaultLimit,
  message
}) {
  return rateLimit({
    windowMs,
    limit: (req) => {
      if (typeof limitFn === "function") {
        const val = limitFn(req);
        if (typeof val === "number" && !isNaN(val) && val > 0) {
          return val;
        }
      }
      return defaultLimit;
    },
    standardHeaders: true, // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
    legacyHeaders: false,   // Disable deprecated X-RateLimit-* headers
    statusCode: 429,
    message: { success: false, message },
    skip: () => process.env.RATE_LIMIT_DISABLED === "true",
    validate: { xForwardedForHeader: false },
    handler: (req, res, _next, options) => {
      return res.status(options.statusCode).json(options.message);
    }
  });
}

/**
 * 1. Authentication Limiter (Login & Registration)
 * Protects against brute-force password guessing and credential stuffing.
 * Default: 15 requests per 15-minute window per IP.
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limitFn: () => Number(process.env.RATE_LIMIT_AUTH_MAX),
  defaultLimit: 15,
  message: "Too many authentication attempts from this IP. Please try again after 15 minutes."
});

/**
 * 2. Device Pairing Code Limiter
 * Protects against enumeration or brute-forcing of 6-character pairing codes.
 * Default: 15 requests per 15-minute window per IP.
 */
const deviceLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limitFn: () => Number(process.env.RATE_LIMIT_DEVICE_MAX),
  defaultLimit: 15,
  message: "Too many device pairing attempts from this IP. Please try again after 15 minutes."
});

/**
 * 3. Emergency SOS Limiter
 * Balanced to allow urgent repeated button presses or connectivity retries
 * during genuine emergencies without extended lockouts, while blocking automated DoS.
 * Default: 10 requests per 1-minute rolling window per IP.
 */
const sosLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute rolling window (prevents prolonged lockouts)
  limitFn: () => Number(process.env.RATE_LIMIT_SOS_MAX),
  defaultLimit: 10,
  message: "Too many SOS triggers from this IP. Please wait a moment before retrying or contact emergency services directly."
});

/**
 * 4. AI Resource Limiter
 * Protects computationally intensive LLM endpoints and external provider tokens.
 * Default: 20 requests per 1-minute window per IP.
 */
const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limitFn: () => Number(process.env.RATE_LIMIT_AI_MAX),
  defaultLimit: 20,
  message: "Too many AI requests. Please slow down and try again shortly."
});

/**
 * 5. Nearby Geocoding & Hospital Lookup Limiter
 * Protects external OpenStreetMap/Overpass API quota from client-side flooding.
 * Default: 30 requests per 1-minute window per IP.
 */
const nearbyLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limitFn: () => Number(process.env.RATE_LIMIT_NEARBY_MAX),
  defaultLimit: 30,
  message: "Too many hospital lookup requests from this IP. Please try again shortly."
});

module.exports = {
  createRateLimiter,
  authLimiter,
  deviceLoginLimiter,
  sosLimiter,
  aiLimiter,
  nearbyLimiter
};
