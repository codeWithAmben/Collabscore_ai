import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEFAULT_DATABASE_URL = 'mysql://root:@127.0.0.1:3306/collabscore_ai';

function parseDatabaseUrl(rawUrl) {
  const value = rawUrl || DEFAULT_DATABASE_URL;
  try {
    const parsed = new URL(value);
    return {
      host: parsed.hostname || '127.0.0.1',
      port: Number(parsed.port) || 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'collabscore_ai'
    };
  } catch {
    return {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'collabscore_ai'
    };
  }
}

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const parsedOrigins = frontendUrl
  .split(',')
  .map((item) => item.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = Array.from(new Set([...parsedOrigins, ...defaultDevOrigins]));

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  frontendUrl: parsedOrigins[0] || 'http://localhost:5173',
  allowedOrigins,
  databaseUrl: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  db: parseDatabaseUrl(process.env.DATABASE_URL),
  allowMemoryFallback: process.env.ALLOW_MEMORY_FALLBACK !== 'false',
  jwtSecret: process.env.JWT_SECRET || 'collabscore-dev-jwt-secret-change-in-production',
  tokenEncryptionKey:
    process.env.TOKEN_ENCRYPTION_KEY || 'collabscore-dev-aes-key-32chars!',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
};
