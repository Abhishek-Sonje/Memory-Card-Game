export const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "your-secret-key",
  EXPIRES_IN: "24h",
} as const;
