import { google } from 'googleapis';
import { config } from '../config/env.js';
import { decryptToken, encryptToken } from '../middleware/auth.js';
import { updateUserTokens } from '../db/repository.js';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly'
];

export const SAMPLE_CLASSROOM_COURSES = [
  {
    id: 'classroom-cs401-fall',
    name: 'CS 401 — Software Engineering Capstone',
    section: 'Section 02 (Fall)',
    courseState: 'ACTIVE',
    alternateLink: 'https://classroom.google.com',
    courseWorkTitle: 'Final Capstone Group Deliverable',
    suggestedMembers: [
      {
        user_name: 'Maya Lin',
        user_email: 'maya.lin@university.edu',
        assigned_section: 'Architecture & API Integration',
        is_leader: true
      },
      {
        user_name: 'Daniel Okafor',
        user_email: 'daniel.okafor@university.edu',
        assigned_section: 'Data Pipeline & Testing',
        is_leader: false
      },
      {
        user_name: 'Sofia Reyes',
        user_email: 'sofia.reyes@university.edu',
        assigned_section: 'UI Research & Presentation',
        is_leader: false
      },
      {
        user_name: 'Jordan Brooks',
        user_email: 'jordan.brooks@university.edu',
        assigned_section: 'Literature Review & Appendix',
        is_leader: false
      }
    ]
  },
  {
    id: 'classroom-econ312-fall',
    name: 'ECON 312 — Applied Econometrics',
    section: 'Lab B',
    courseState: 'ACTIVE',
    alternateLink: 'https://classroom.google.com',
    courseWorkTitle: 'Term Research Empirical Paper',
    suggestedMembers: []
  },
  {
    id: 'classroom-bio210-fall',
    name: 'BIO 210 — Computational Genomics Lab',
    section: 'Cohort 1',
    courseState: 'ACTIVE',
    alternateLink: 'https://classroom.google.com',
    courseWorkTitle: 'Variant Calling Pipeline Report',
    suggestedMembers: []
  }
];

export function isGoogleOAuthConfigured() {
  return Boolean(config.googleClientId && config.googleClientSecret);
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );
}

export function getAuthUrl(state = 'collabscore') {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GOOGLE_SCOPES,
    state
  });
}

export async function exchangeCodeForTokens(code) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: profile } = await oauth2.userinfo.get();
  return { tokens, profile };
}

export function getAuthorizedClientForUser(user) {
  if (!isGoogleOAuthConfigured()) return null;
  const accessToken = decryptToken(user?.access_token);
  const refreshToken = decryptToken(user?.refresh_token);
  if (!accessToken && !refreshToken) return null;

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined
  });

  oauth2Client.on('tokens', async (newTokens) => {
    try {
      await updateUserTokens(user.id, {
        access_token: newTokens.access_token ? encryptToken(newTokens.access_token) : null,
        refresh_token: newTokens.refresh_token ? encryptToken(newTokens.refresh_token) : null
      });
    } catch (err) {
      console.warn('[GoogleOAuth] Failed to persist refreshed tokens:', err.message);
    }
  });

  return oauth2Client;
}

export async function getFreshAccessTokenForUser(user) {
  const client = getAuthorizedClientForUser(user);
  if (!client) return null;
  const tokenResponse = await client.getAccessToken();
  return tokenResponse?.token || null;
}

export async function extractFileRevisions(oauthClient, fileId) {
  const drive = google.drive({ version: 'v3', auth: oauthClient });

  const { data: fileMeta } = await drive.files.get({
    fileId,
    fields:
      'id, name, mimeType, webViewLink, size, modifiedTime, lastModifyingUser(displayName, emailAddress)'
  });

  const allRevisions = [];
  let pageToken = undefined;
  let guard = 0;

  try {
    do {
      const { data } = await drive.revisions.list({
        fileId,
        pageSize: 100,
        pageToken,
        fields:
          'nextPageToken, revisions(id, modifiedTime, lastModifyingUser(displayName, emailAddress), size)'
      });
      if (Array.isArray(data.revisions)) {
        allRevisions.push(...data.revisions);
      }
      pageToken = data.nextPageToken || undefined;
      guard += 1;
    } while (pageToken && guard < 10);
  } catch (err) {
    // Some Google Drive binary or view-only items restrict revisions.list; fall back to file metadata
    if (err.code !== 403 && err.code !== 404) {
      throw err;
    }
  }

  if (allRevisions.length === 0 && fileMeta.lastModifyingUser) {
    allRevisions.push({
      id: 'meta-latest',
      modifiedTime: fileMeta.modifiedTime || new Date().toISOString(),
      lastModifyingUser: fileMeta.lastModifyingUser,
      size: fileMeta.size || null
    });
  }

  allRevisions.sort(
    (a, b) => new Date(a.modifiedTime).getTime() - new Date(b.modifiedTime).getTime()
  );

  const byContributor = new Map();
  let previousSize = null;

  for (const rev of allRevisions) {
    const rawName = rev.lastModifyingUser?.displayName || 'Google Drive Collaborator';
    const rawEmail = (
      rev.lastModifyingUser?.emailAddress ||
      `${rawName.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@workspace.local`
    ).toLowerCase();

    const parsedSize = rev.size !== undefined && rev.size !== null ? Number(rev.size) : null;
    let delta = 0;
    if (parsedSize !== null && !Number.isNaN(parsedSize)) {
      delta = previousSize === null ? parsedSize : Math.max(0, parsedSize - previousSize);
      previousSize = parsedSize;
    }

    const modifiedIso = rev.modifiedTime || new Date().toISOString();
    const dayKey = modifiedIso.slice(0, 10);

    if (!byContributor.has(rawEmail)) {
      byContributor.set(rawEmail, {
        contributor_email: rawEmail,
        contributor_name: rawName,
        revision_count: 0,
        bytes_added: 0,
        last_edit_at: modifiedIso,
        dailyMap: new Map()
      });
    }

    const entry = byContributor.get(rawEmail);
    entry.revision_count += 1;
    entry.bytes_added += delta;
    if (modifiedIso > entry.last_edit_at) {
      entry.last_edit_at = modifiedIso;
    }

    const dayBucket = entry.dailyMap.get(dayKey) || { date: dayKey, edits: 0, bytes: 0 };
    dayBucket.edits += 1;
    dayBucket.bytes += delta;
    entry.dailyMap.set(dayKey, dayBucket);
  }

  const contributors = Array.from(byContributor.values()).map((entry) => {
    const timeline = Array.from(entry.dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return {
      contributor_email: entry.contributor_email,
      contributor_name: entry.contributor_name,
      revision_count: entry.revision_count,
      bytes_added: entry.bytes_added,
      active_days: timeline.length,
      last_edit_at: entry.last_edit_at,
      raw_timeline_json: timeline
    };
  });

  return {
    file: {
      google_file_id: fileMeta.id,
      file_name: fileMeta.name,
      mime_type: fileMeta.mimeType,
      web_view_link: fileMeta.webViewLink
    },
    revisions: contributors
  };
}

export async function listClassroomCourses(oauthClient) {
  if (!oauthClient) {
    return {
      courses: SAMPLE_CLASSROOM_COURSES,
      source: 'fallback-sample',
      fallbackRequired: true,
      message: 'Sign in with Google OAuth to load your live Google Classroom courses, or use manual entry.'
    };
  }

  const classroom = google.classroom({ version: 'v1', auth: oauthClient });
  const { data } = await classroom.courses.list({
    courseStates: ['ACTIVE'],
    pageSize: 20
  });

  const liveCourses = data.courses || [];
  if (liveCourses.length === 0) {
    return {
      courses: [],
      source: 'google-classroom',
      fallbackRequired: true,
      message: 'No active Google Classroom courses were found on this account. Enter members manually.'
    };
  }

  const enriched = await Promise.all(
    liveCourses.map(async (course) => {
      let courseWorkTitle = null;
      try {
        const cwRes = await classroom.courses.courseWork.list({
          courseId: course.id,
          pageSize: 5
        });
        courseWorkTitle = cwRes.data.courseWork?.[0]?.title || null;
      } catch {
        // Ignore coursework read errors on courses where user is not enrolled as expected
      }

      return {
        id: course.id,
        name: course.name,
        section: course.section || '',
        courseState: course.courseState,
        alternateLink: course.alternateLink || null,
        courseWorkTitle
      };
    })
  );

  return {
    courses: enriched,
    source: 'google-classroom',
    fallbackRequired: false,
    message: null
  };
}

export async function listCourseRoster(oauthClient, courseId) {
  const sampleMatch = SAMPLE_CLASSROOM_COURSES.find((c) => c.id === courseId);
  if (!oauthClient) {
    return {
      courseId,
      students: sampleMatch?.suggestedMembers || [],
      source: 'fallback-sample',
      fallbackRequired: true
    };
  }

  const classroom = google.classroom({ version: 'v1', auth: oauthClient });
  try {
    const { data } = await classroom.courses.students.list({
      courseId,
      pageSize: 50
    });
    const students = (data.students || []).map((s) => ({
      user_name: s.profile?.name?.fullName || s.profile?.emailAddress || 'Student',
      user_email: (s.profile?.emailAddress || '').toLowerCase(),
      assigned_section: 'General Contribution',
      is_leader: false
    }));
    return {
      courseId,
      students: students.filter((s) => s.user_email),
      source: 'google-classroom',
      fallbackRequired: students.length === 0
    };
  } catch (err) {
    return {
      courseId,
      students: sampleMatch?.suggestedMembers || [],
      source: 'fallback-manual',
      fallbackRequired: true,
      warning:
        'Google Classroom restricted roster listing for this course (common for student accounts). Add teammate emails manually.'
    };
  }
}

export function generateSimulatedRevisionsForFile(file, members = []) {
  const today = new Date();
  const makeDate = (daysAgo) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const makeIso = (daysAgo) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    d.setUTCHours(15, 30, 0, 0);
    return d.toISOString();
  };

  if (!members || members.length === 0) {
    return [];
  }

  const seedHash = Array.from(file.google_file_id || file.file_name || 'file').reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0
  );

  return members.map((member, index) => {
    const isLastLowMember = members.length >= 3 && index === members.length - 1;
    let revCount;
    let bytesAdded;
    let timeline;

    if (member.is_leader) {
      revCount = 12 + (seedHash % 6);
      bytesAdded = 9200 + (seedHash % 2400);
      timeline = [
        { date: makeDate(6), edits: Math.max(2, Math.floor(revCount * 0.25)), bytes: Math.floor(bytesAdded * 0.25) },
        { date: makeDate(4), edits: Math.max(2, Math.floor(revCount * 0.25)), bytes: Math.floor(bytesAdded * 0.28) },
        { date: makeDate(2), edits: Math.max(2, Math.floor(revCount * 0.25)), bytes: Math.floor(bytesAdded * 0.25) },
        { date: makeDate(0), edits: Math.max(2, revCount - 3 * Math.floor(revCount * 0.25)), bytes: Math.floor(bytesAdded * 0.22) }
      ];
    } else if (isLastLowMember) {
      revCount = 1 + (seedHash % 2);
      bytesAdded = 450 + (seedHash % 300);
      timeline = [{ date: makeDate(0), edits: revCount, bytes: bytesAdded }];
    } else {
      revCount = 7 + ((seedHash + index * 3) % 5);
      bytesAdded = 5400 + ((seedHash + index * 700) % 1800);
      timeline = [
        { date: makeDate(5), edits: Math.max(1, Math.floor(revCount * 0.35)), bytes: Math.floor(bytesAdded * 0.35) },
        { date: makeDate(3), edits: Math.max(1, Math.floor(revCount * 0.35)), bytes: Math.floor(bytesAdded * 0.35) },
        { date: makeDate(1), edits: Math.max(1, revCount - 2 * Math.floor(revCount * 0.35)), bytes: Math.floor(bytesAdded * 0.3) }
      ];
    }

    return {
      contributor_email: member.user_email.toLowerCase(),
      contributor_name: member.user_name,
      revision_count: revCount,
      bytes_added: bytesAdded,
      active_days: timeline.length,
      last_edit_at: makeIso(timeline.length > 1 ? 0 : 0),
      raw_timeline_json: timeline
    };
  });
}
