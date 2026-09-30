import { createHash, randomBytes } from 'node:crypto';

export const createSessionToken = () => randomBytes(32).toString('base64url');
export const createCsrfToken = () => randomBytes(32).toString('base64url');
export const sha256 = value => createHash('sha256').update(value).digest('hex');
