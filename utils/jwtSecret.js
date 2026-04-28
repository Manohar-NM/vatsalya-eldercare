const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "secret123";

  if (process.env.NODE_ENV === "production" && secret === "secret123") {
    throw new Error("JWT_SECRET must be set in production");
  }

  return secret;
};

module.exports = { getJwtSecret };
