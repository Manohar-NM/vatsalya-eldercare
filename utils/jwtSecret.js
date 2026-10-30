const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!secret || secret === "secret123" || secret.trim().length < 32) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION: JWT_SECRET must be configured with a cryptographically strong string (minimum 32 characters) in production environment."
      );
    }
    return secret;
  }

  // Development/Test fallback with warning
  if (!secret) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "⚠️  [SECURITY WARNING] JWT_SECRET is not set in environment. Using development fallback secret. Please set JWT_SECRET in your .env file."
      );
    }
    return "dev_jwt_secret_vatsalya_local_development_only_replace_in_prod";
  }

  return secret;
};

module.exports = { getJwtSecret };

