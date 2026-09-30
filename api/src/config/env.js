export const env = {
  port: Number(process.env.PORT) || 3000,
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:4200',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  sessionHours: Math.min(24, Math.max(1, Number(process.env.SESSION_HOURS) || 8)),
  mongoDbName: process.env.MONGODB_DB || 'vms',
  mongoUri: process.env.MONGODB_URI
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict',
  path: '/'
};
