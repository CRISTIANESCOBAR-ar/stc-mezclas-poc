import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
// OWASP's 32 MiB scrypt configuration; parameters are recorded in each hash.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefix = 'scrypt$32768$8$3';
const dummyHash = `${prefix}$${'0'.repeat(32)}$${'0'.repeat(128)}`;

export function normalizeUsername(username) {
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,64}$/.test(username)) throw Object.assign(new Error('El usuario debe tener entre 3 y 64 letras, números, puntos, guiones o guiones bajos.'), { statusCode: 400 });
  return username.toLowerCase();
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw Object.assign(new Error('La contraseña debe tener entre 12 y 1024 caracteres.'), { statusCode: 400 });
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64, options);
  return `${prefix}$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === 'string' && /^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, , , , salt, expected] = (valid ? encoded : dummyHash).split('$');
  const usable = typeof password === 'string' && password.length <= 1024;
  const actual = await derive(usable ? password : '', salt, 64, options);
  return usable && valid && timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}

export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const randomToken = () => randomBytes(32).toString('hex');
export function equalTokens(actual, expected) {
  return typeof actual === 'string' && typeof expected === 'string' && /^[a-f0-9]{64}$/.test(actual) && expected.length === 64 && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
