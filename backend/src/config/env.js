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

export function resolveDbConfig(env = process.env) {
  const rawUrl = env.DATABASE_URL || env.MYSQL_URL || env.MYSQL_PUBLIC_URL || '';
  const hasIndividualMysqlVars = Boolean(env.MYSQLHOST || env.MYSQL_HOST);
  const hasExplicitDbConfig = Boolean(rawUrl || hasIndividualMysqlVars);

  let db;
  if (rawUrl) {
    db = parseDatabaseUrl(rawUrl);
  } else if (hasIndividualMysqlVars) {
    db = {
      host: env.MYSQLHOST || env.MYSQL_HOST || '127.0.0.1',
      port: Number(env.MYSQLPORT || env.MYSQL_PORT) || 3306,
      user: env.MYSQLUSER || env.MYSQL_USER || 'root',
      password: env.MYSQLPASSWORD ?? env.MYSQL_ROOT_PASSWORD ?? env.MYSQL_PASSWORD ?? '',
      database: env.MYSQLDATABASE || env.MYSQL_DATABASE || 'railway'
    };
  } else {
    db = parseDatabaseUrl(DEFAULT_DATABASE_URL);
  }

  const ssl =
    env.MYSQL_SSL === 'true' || /[?&]ssl(-mode)?=(true|required)/i.test(rawUrl);

  return {
    databaseUrl: rawUrl || DEFAULT_DATABASE_URL,
    db: { ...db, ssl },
    hasExplicitDbConfig
  };
}

export function buildConfig(env = process.env) {
  const railwayPublicDomain = (env.RAILWAY_PUBLIC_DOMAIN || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');
  const railwayOrigin = railwayPublicDomain ? `https://${railwayPublicDomain}` : '';
  const isRailway = Boolean(
    env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || railwayPublicDomain
  );

  const frontendUrlInput = env.FRONTEND_URL || railwayOrigin || 'http://localhost:5173';
  const parsedOrigins = frontendUrlInput
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const allowedOrigins = Array.from(
    new Set([
      ...parsedOrigins,
      ...(railwayOrigin ? [railwayOrigin] : []),
      ...defaultDevOrigins
    ])
  );

  const { databaseUrl, db, hasExplicitDbConfig } = resolveDbConfig(env);

  return {
    nodeEnv: env.NODE_ENV || 'development',
    isProduction: env.NODE_ENV === 'production',
    isRailway,
    port: Number(env.PORT) || 5000,
    frontendUrl: parsedOrigins[0] || railwayOrigin || 'http://localhost:5173',
    allowedOrigins,
    databaseUrl,
    db,
    hasExplicitDbConfig,
    allowMemoryFallback: env.ALLOW_MEMORY_FALLBACK !== 'false',
    jwtSecret: env.JWT_SECRET || 'collabscore-dev-jwt-secret-change-in-production',
    tokenEncryptionKey:
      env.TOKEN_ENCRYPTION_KEY || 'collabscore-dev-aes-key-32chars!',
    googleClientId: env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri:
      env.GOOGLE_REDIRECT_URI ||
      (railwayOrigin
        ? `${railwayOrigin}/api/auth/google/callback`
        : 'http://localhost:5000/api/auth/google/callback'),
    geminiApiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || 'gemini-3.8-flash'
  };
}

export const config = buildConfig(process.env);
