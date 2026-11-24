import { Router } from 'express';
import { config } from '../config/env.js';
import { getDbMode } from '../db/connection.js';
import {
  ensureDemoSeedData,
  listProjectsForUser,
  sanitizeUser,
  updateUserRole,
  upsertGoogleUser
} from '../db/repository.js';
import {
  clearAuthCookie,
  encryptToken,
  requireAuth,
  setAuthCookie,
  signAuthToken
} from '../middleware/auth.js';
import {
  exchangeCodeForTokens,
  getAuthUrl,
  getFreshAccessTokenForUser,
  isGoogleOAuthConfigured
} from '../services/googleService.js';

const router = Router();

router.get('/config', (req, res) => {
  res.json({
    googleOAuthEnabled: isGoogleOAuthConfigured(),
    geminiConfigured: Boolean(config.geminiApiKey),
    geminiModel: config.geminiModel,
    dbMode: getDbMode()
  });
});

router.get('/google', (req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      error:
        'Google OAuth is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env or use Demo Workspace Mode.'
    });
  }
  const url = getAuthUrl('collabscore_oauth');
  return res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(
      `${config.frontendUrl}/?auth_error=${encodeURIComponent(String(error))}`
    );
  }
  if (!code || typeof code !== 'string') {
    return res.redirect(`${config.frontendUrl}/?auth_error=missing_oauth_code`);
  }

  try {
    const { tokens, profile } = await exchangeCodeForTokens(code);
    const user = await upsertGoogleUser({
      google_id: profile.id,
      email: profile.email,
      name: profile.name || profile.email,
      avatar_url: profile.picture || null,
      access_token: tokens.access_token ? encryptToken(tokens.access_token) : null,
      refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null
    });

    const existingProjects = await listProjectsForUser(user);
    if (existingProjects.length === 0) {
      // Ensure demo dataset is also present for quick comparison, while keeping user workspace ready
      await ensureDemoSeedData();
    }

    const jwtToken = signAuthToken(user);
    setAuthCookie(res, jwtToken);
    return res.redirect(`${config.frontendUrl}/#token=${encodeURIComponent(jwtToken)}`);
  } catch (err) {
    console.error('[Auth] Google OAuth callback failed:', err.message);
    return res.redirect(
      `${config.frontendUrl}/?auth_error=${encodeURIComponent('google_oauth_failed')}`
    );
  }
});

router.post('/demo', async (req, res, next) => {
  try {
    const demoUser = await ensureDemoSeedData();
    const token = signAuthToken(demoUser);
    setAuthCookie(res, token);
    res.json({
      token,
      user: sanitizeUser(demoUser),
      dbMode: getDbMode()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: sanitizeUser(req.user),
    dbMode: getDbMode()
  });
});

router.patch('/role', requireAuth, async (req, res, next) => {
  try {
    const requestedRole = String(req.body?.role || '').toUpperCase();
    if (requestedRole !== 'STUDENT' && requestedRole !== 'INSTRUCTOR') {
      return res.status(400).json({ error: 'Role must be STUDENT or INSTRUCTOR' });
    }
    const updatedUser = await updateUserRole(req.user.id, requestedRole);
    const token = signAuthToken(updatedUser);
    setAuthCookie(res, token);
    res.json({
      token,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/google-token', requireAuth, async (req, res) => {
  try {
    const accessToken = await getFreshAccessTokenForUser(req.user);
    if (!accessToken) {
      return res.status(400).json({
        error: 'No live Google OAuth token attached to this session.'
      });
    }
    res.json({ access_token: accessToken });
  } catch (error) {
    res.status(401).json({
      error: `Unable to refresh Google access token: ${error.message}`
    });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export default router;
