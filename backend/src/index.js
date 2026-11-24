import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env.js';
import { getDbMode, initDatabase } from './db/connection.js';
import { ensureDemoSeedData } from './db/repository.js';
import authRoutes from './routes/authRoutes.js';
import classroomRoutes from './routes/classroomRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import { isGoogleOAuthConfigured } from './services/googleService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST_DIR = path.resolve(__dirname, '../../frontend/dist');
const FRONTEND_INDEX_HTML = path.join(FRONTEND_DIST_DIR, 'index.html');

const app = express();

app.set('trust proxy', 1);

app.use(
  cors((req, callback) => {
    const origin = req.header('Origin');
    if (!origin) {
      return callback(null, { origin: true, credentials: true });
    }
    const cleanOrigin = origin.replace(/\/+$/, '');
    const hostHeader = req.get('host');
    const sameOrigin =
      Boolean(hostHeader) &&
      (cleanOrigin === `https://${hostHeader}` || cleanOrigin === `http://${hostHeader}`);

    if (sameOrigin || config.allowedOrigins.includes(cleanOrigin)) {
      return callback(null, { origin: true, credentials: true });
    }
    return callback(null, { origin: false });
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'collabscore-ai-api',
    dbMode: getDbMode(),
    geminiModel: config.geminiModel,
    geminiConfigured: Boolean(config.geminiApiKey),
    googleOAuthEnabled: isGoogleOAuthConfigured(),
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/classroom', classroomRoutes);
app.use('/api/projects', projectRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

if (fs.existsSync(FRONTEND_INDEX_HTML)) {
  app.use(express.static(FRONTEND_DIST_DIR));
  app.get('*', (req, res) => {
    res.sendFile(FRONTEND_INDEX_HTML);
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });
}

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[API Error]', err);
  }
  res.status(status).json({
    error: err.message || 'Internal server error'
  });
});

async function startServer() {
  await initDatabase();
  await ensureDemoSeedData();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(
      `[Server] CollabScore AI API listening on 0.0.0.0:${config.port} (DB: ${getDbMode()}, AI: ${config.geminiModel})`
    );
  });
}

startServer().catch((error) => {
  console.error('[Server] Fatal startup failure:', error);
  process.exit(1);
});
