function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required(
    "DATABASE_URL",
    "postgres://commerce_os:commerce_os@localhost:5432/commerce_os",
  ),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "cos_session",
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7),
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
};
