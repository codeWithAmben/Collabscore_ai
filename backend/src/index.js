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

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      if (config.allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not permitted by CORS`));
    },
    credentials: true
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

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

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

  app.listen(config.port, () => {
    console.log(
      `[Server] CollabScore AI API listening on port ${config.port} (DB: ${getDbMode()}, AI: ${config.geminiModel})`
    );
  });
}

startServer().catch((error) => {
  console.error('[Server] Fatal startup failure:', error);
  process.exit(1);
});
