import { env } from '../config/env.js';

const allowedOrigins = new Set([
  env.webOrigin,
  'http://localhost:4200',
  'http://127.0.0.1:4200'
]);

export function corsMiddleware(req, res, next) {
  const origin = req.get('Origin');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.has(origin) ? origin : env.webOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}
