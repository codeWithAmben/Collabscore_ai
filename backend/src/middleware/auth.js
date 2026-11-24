import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { DEMO_USER } from '../db/demoData.js';
import { ensureDemoSeedData, getUserById } from '../db/repository.js';

function deriveAesKey() {
  return crypto.createHash('sha256').update(config.tokenEncryptionKey).digest();
}

export function encryptToken(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveAesKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptToken(payload) {
  if (!payload || typeof payload !== 'string') return null;
  const parts = payload.split(':');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveAesKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function verifyAuthToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

export function setAuthCookie(res, token) {
  res.cookie('collabscore_token', token, {
    httpOnly: true,
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(res) {
  res.clearCookie('collabscore_token', {
    httpOnly: true,
    sameSite: config.isProduction ? 'none' : 'lax',
    secure: config.isProduction
  });
}

export function extractRequestToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies?.collabscore_token) {
    return req.cookies.collabscore_token;
  }
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractRequestToken(req);
    const payload = verifyAuthToken(token);
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let user = await getUserById(payload.sub);
    if (!user && payload.email === DEMO_USER.email) {
      user = await ensureDemoSeedData();
    }

    if (!user) {
      return res.status(401).json({ error: 'Session user no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
