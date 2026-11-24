import { getPool, isMySqlReady, parseJsonColumn } from './connection.js';
import { DEMO_PROJECTS, DEMO_USER } from './demoData.js';

function toMysqlDateTime(input) {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function toIsoStringOrNull(input) {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const memoryStore = {
  initialized: false,
  seq: {
    users: 1,
    projects: 1,
    project_members: 1,
    project_files: 1,
    revision_logs: 1,
    peer_reviews: 1,
    ai_evaluations: 1
  },
  users: [],
  projects: [],
  project_members: [],
  project_files: [],
  revision_logs: [],
  peer_reviews: [],
  ai_evaluations: []
};

function initMemoryDemoStore() {
  if (memoryStore.initialized) return;
  memoryStore.initialized = true;

  const user = {
    id: memoryStore.seq.users++,
    google_id: DEMO_USER.google_id,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    avatar_url: DEMO_USER.avatar_url,
    role: DEMO_USER.role,
    access_token: null,
    refresh_token: null,
    created_at: new Date().toISOString()
  };
  memoryStore.users.push(user);

  for (const proj of DEMO_PROJECTS) {
    const projectId = memoryStore.seq.projects++;
    memoryStore.projects.push({
      id: projectId,
      title: proj.title,
      course_name: proj.course_name,
      classroom_course_id: proj.classroom_course_id,
      owner_id: user.id,
      group_base_grade: Number(proj.group_base_grade),
      status: proj.status,
      created_at: new Date().toISOString()
    });

    for (const member of proj.members) {
      memoryStore.project_members.push({
        id: memoryStore.seq.project_members++,
        project_id: projectId,
        user_email: member.user_email.toLowerCase(),
        user_name: member.user_name,
        assigned_section: member.assigned_section,
        is_leader: Boolean(member.is_leader)
      });
    }

    for (const file of proj.files) {
      const fileId = memoryStore.seq.project_files++;
      memoryStore.project_files.push({
        id: fileId,
        project_id: projectId,
        google_file_id: file.google_file_id,
        file_name: file.file_name,
        mime_type: file.mime_type,
        web_view_link: file.web_view_link,
        last_synced_at: file.last_synced_at
      });

      for (const rev of file.revisions) {
        memoryStore.revision_logs.push({
          id: memoryStore.seq.revision_logs++,
          project_file_id: fileId,
          contributor_email: rev.contributor_email.toLowerCase(),
          contributor_name: rev.contributor_name,
          revision_count: rev.revision_count,
          bytes_added: rev.bytes_added,
          active_days: rev.active_days,
          last_edit_at: rev.last_edit_at,
          raw_timeline_json: rev.raw_timeline_json
        });
      }
    }

    for (const review of proj.peer_reviews) {
      memoryStore.peer_reviews.push({
        id: memoryStore.seq.peer_reviews++,
        project_id: projectId,
        reviewer_email: review.reviewer_email.toLowerCase(),
        reviewee_email: review.reviewee_email.toLowerCase(),
        owned_task: review.owned_task,
        rating: review.rating,
        comment: review.comment
      });
    }

    if (proj.ai_evaluation) {
      memoryStore.ai_evaluations.push({
        id: memoryStore.seq.ai_evaluations++,
        project_id: projectId,
        model_used: proj.ai_evaluation.model_used,
        evaluation_json: proj.ai_evaluation.evaluation_json,
        created_at: new Date().toISOString()
      });
    }
  }
}

export function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    google_id: user.google_id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
    has_google_tokens: Boolean(user.access_token || user.refresh_token),
    created_at: toIsoStringOrNull(user.created_at) || user.created_at
  };
}

export function computeMemberDriveStats(members, files, revisionLogs, peerReviews) {
  const byEmail = new Map();

  for (const m of members) {
    const email = m.user_email.toLowerCase();
    byEmail.set(email, {
      email,
      name: m.user_name,
      assigned_section: m.assigned_section,
      is_leader: Boolean(m.is_leader),
      total_revisions: 0,
      total_bytes_added: 0,
      active_days: 0,
      files_touched: 0,
      last_edit_at: null,
      timelineMap: new Map(),
      fileSet: new Set(),
      peer_ratings: [],
      self_rating: null,
      owned_tasks: []
    });
  }

  for (const log of revisionLogs) {
    const email = (log.contributor_email || '').toLowerCase();
    if (!email) continue;
    if (!byEmail.has(email)) {
      byEmail.set(email, {
        email,
        name: log.contributor_name || email,
        assigned_section: 'External Collaborator',
        is_leader: false,
        total_revisions: 0,
        total_bytes_added: 0,
        active_days: 0,
        files_touched: 0,
        last_edit_at: null,
        timelineMap: new Map(),
        fileSet: new Set(),
        peer_ratings: [],
        self_rating: null,
        owned_tasks: []
      });
    }
    const entry = byEmail.get(email);
    entry.total_revisions += Number(log.revision_count) || 0;
    entry.total_bytes_added += Number(log.bytes_added) || 0;
    entry.fileSet.add(log.project_file_id);

    const logLast = toIsoStringOrNull(log.last_edit_at);
    if (logLast && (!entry.last_edit_at || logLast > entry.last_edit_at)) {
      entry.last_edit_at = logLast;
    }

    const timeline = Array.isArray(log.raw_timeline_json) ? log.raw_timeline_json : [];
    if (timeline.length > 0) {
      for (const point of timeline) {
        if (!point?.date) continue;
        const prev = entry.timelineMap.get(point.date) || { date: point.date, edits: 0, bytes: 0 };
        prev.edits += Number(point.edits) || 0;
        prev.bytes += Number(point.bytes) || 0;
        entry.timelineMap.set(point.date, prev);
      }
    } else {
      entry.active_days = Math.max(entry.active_days, Number(log.active_days) || 0);
    }
  }

  for (const rev of peerReviews) {
    const reviewee = (rev.reviewee_email || '').toLowerCase();
    const reviewer = (rev.reviewer_email || '').toLowerCase();
    const entry = byEmail.get(reviewee);
    if (!entry) continue;
    const rating = Number(rev.rating) || 0;
    if (reviewer === reviewee) {
      entry.self_rating = rating;
    } else {
      entry.peer_ratings.push(rating);
    }
    if (rev.owned_task && !entry.owned_tasks.includes(rev.owned_task)) {
      entry.owned_tasks.push(rev.owned_task);
    }
  }

  let teamMaxTimelineSpanDays = 1;
  const allDates = [];
  for (const entry of byEmail.values()) {
    for (const d of entry.timelineMap.keys()) {
      allDates.push(d);
    }
  }
  if (allDates.length >= 2) {
    allDates.sort();
    const startMs = new Date(allDates[0]).getTime();
    const endMs = new Date(allDates[allDates.length - 1]).getTime();
    teamMaxTimelineSpanDays = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
  }

  const totalTeamRevisions = Array.from(byEmail.values()).reduce(
    (sum, item) => sum + item.total_revisions,
    0
  );
  const totalTeamBytes = Array.from(byEmail.values()).reduce(
    (sum, item) => sum + item.total_bytes_added,
    0
  );

  return Array.from(byEmail.values()).map((entry) => {
    const timeline = Array.from(entry.timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const computedActiveDays = timeline.length > 0 ? timeline.length : entry.active_days;
    const filesTouched = entry.fileSet.size;

    let crammingRisk = false;
    if (entry.total_revisions === 0 && files.length > 0) {
      crammingRisk = true;
    } else if (computedActiveDays === 1 && teamMaxTimelineSpanDays >= 4) {
      crammingRisk = true;
    } else if (timeline.length >= 2 && entry.total_revisions > 0) {
      const lastDayEdits = timeline[timeline.length - 1].edits;
      if (lastDayEdits / entry.total_revisions >= 0.78 && computedActiveDays <= 2) {
        crammingRisk = true;
      }
    }

    const peerAvg =
      entry.peer_ratings.length > 0
        ? Number(
            (
              entry.peer_ratings.reduce((a, b) => a + b, 0) / entry.peer_ratings.length
            ).toFixed(2)
          )
        : entry.self_rating;

    return {
      email: entry.email,
      name: entry.name,
      assigned_section: entry.assigned_section,
      is_leader: entry.is_leader,
      total_revisions: entry.total_revisions,
      total_bytes_added: entry.total_bytes_added,
      active_days: computedActiveDays,
      files_touched: filesTouched,
      last_edit_at: entry.last_edit_at,
      revision_share_pct:
        totalTeamRevisions > 0
          ? Number(((entry.total_revisions / totalTeamRevisions) * 100).toFixed(1))
          : 0,
      bytes_share_pct:
        totalTeamBytes > 0
          ? Number(((entry.total_bytes_added / totalTeamBytes) * 100).toFixed(1))
          : 0,
      cramming_risk: crammingRisk,
      peer_rating_avg: peerAvg,
      self_rating: entry.self_rating,
      peer_review_count: entry.peer_ratings.length,
      owned_tasks: entry.owned_tasks,
      timeline
    };
  });
}

export async function ensureDemoSeedData({ resetEvaluations = false } = {}) {
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    return memoryStore.users[0];
  }

  const pool = getPool();
  const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [
    DEMO_USER.email
  ]);

  let userId;
  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
  } else {
    const [result] = await pool.execute(
      `INSERT INTO users (google_id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, ?)`,
      [DEMO_USER.google_id, DEMO_USER.email, DEMO_USER.name, DEMO_USER.avatar_url, DEMO_USER.role]
    );
    userId = result.insertId;
  }

  for (const proj of DEMO_PROJECTS) {
    const [existingProjects] = await pool.execute(
      'SELECT id FROM projects WHERE owner_id = ? AND title = ? LIMIT 1',
      [userId, proj.title]
    );

    let projectId;
    if (existingProjects.length > 0) {
      projectId = existingProjects[0].id;
    } else {
      const [res] = await pool.execute(
        `INSERT INTO projects (title, course_name, classroom_course_id, owner_id, group_base_grade, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          proj.title,
          proj.course_name,
          proj.classroom_course_id,
          userId,
          proj.group_base_grade,
          proj.status
        ]
      );
      projectId = res.insertId;
    }

    for (const member of proj.members) {
      await pool.execute(
        `INSERT INTO project_members (project_id, user_email, user_name, assigned_section, is_leader)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), assigned_section = VALUES(assigned_section), is_leader = VALUES(is_leader)`,
        [
          projectId,
          member.user_email.toLowerCase(),
          member.user_name,
          member.assigned_section,
          member.is_leader ? 1 : 0
        ]
      );
    }

    for (const file of proj.files) {
      await pool.execute(
        `INSERT INTO project_files (project_id, google_file_id, file_name, mime_type, web_view_link, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), mime_type = VALUES(mime_type), web_view_link = VALUES(web_view_link), last_synced_at = VALUES(last_synced_at)`,
        [
          projectId,
          file.google_file_id,
          file.file_name,
          file.mime_type,
          file.web_view_link,
          toMysqlDateTime(file.last_synced_at)
        ]
      );

      const [fileRows] = await pool.execute(
        'SELECT id FROM project_files WHERE project_id = ? AND google_file_id = ? LIMIT 1',
        [projectId, file.google_file_id]
      );
      const fileId = fileRows[0].id;

      for (const rev of file.revisions) {
        await pool.execute(
          `INSERT INTO revision_logs
           (project_file_id, contributor_email, contributor_name, revision_count, bytes_added, active_days, last_edit_at, raw_timeline_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             contributor_name = VALUES(contributor_name),
             revision_count = VALUES(revision_count),
             bytes_added = VALUES(bytes_added),
             active_days = VALUES(active_days),
             last_edit_at = VALUES(last_edit_at),
             raw_timeline_json = VALUES(raw_timeline_json)`,
          [
            fileId,
            rev.contributor_email.toLowerCase(),
            rev.contributor_name,
            rev.revision_count,
            rev.bytes_added,
            rev.active_days,
            toMysqlDateTime(rev.last_edit_at),
            JSON.stringify(rev.raw_timeline_json)
          ]
        );
      }
    }

    for (const review of proj.peer_reviews) {
      await pool.execute(
        `INSERT INTO peer_reviews (project_id, reviewer_email, reviewee_email, owned_task, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE owned_task = VALUES(owned_task), rating = VALUES(rating), comment = VALUES(comment)`,
        [
          projectId,
          review.reviewer_email.toLowerCase(),
          review.reviewee_email.toLowerCase(),
          review.owned_task,
          review.rating,
          review.comment
        ]
      );
    }

    if (proj.ai_evaluation) {
      const [existingEvals] = await pool.execute(
        'SELECT id FROM ai_evaluations WHERE project_id = ? LIMIT 1',
        [projectId]
      );
      if (existingEvals.length === 0 || resetEvaluations) {
        await pool.execute(
          'INSERT INTO ai_evaluations (project_id, model_used, evaluation_json) VALUES (?, ?, ?)',
          [
            projectId,
            proj.ai_evaluation.model_used,
            JSON.stringify(proj.ai_evaluation.evaluation_json)
          ]
        );
      }
    }
  }

  return getUserById(userId);
}

export async function getUserById(id) {
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    return memoryStore.users.find((u) => u.id === Number(id)) || null;
  }
  const [rows] = await getPool().execute('SELECT * FROM users WHERE id = ? LIMIT 1', [Number(id)]);
  return rows[0] || null;
}

export async function getUserByEmail(email) {
  const normalized = email.toLowerCase();
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    return memoryStore.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }
  const [rows] = await getPool().execute('SELECT * FROM users WHERE email = ? LIMIT 1', [normalized]);
  return rows[0] || null;
}

export async function upsertGoogleUser({
  google_id,
  email,
  name,
  avatar_url,
  access_token,
  refresh_token
}) {
  const normalizedEmail = email.toLowerCase();
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    let user = memoryStore.users.find(
      (u) => (google_id && u.google_id === google_id) || u.email.toLowerCase() === normalizedEmail
    );
    if (user) {
      user.google_id = google_id || user.google_id;
      user.name = name || user.name;
      user.avatar_url = avatar_url || user.avatar_url;
      if (access_token) user.access_token = access_token;
      if (refresh_token) user.refresh_token = refresh_token;
      return user;
    }
    user = {
      id: memoryStore.seq.users++,
      google_id,
      email: normalizedEmail,
      name: name || normalizedEmail,
      avatar_url: avatar_url || null,
      role: 'STUDENT',
      access_token: access_token || null,
      refresh_token: refresh_token || null,
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(user);
    return user;
  }

  const pool = getPool();
  const [existing] = await pool.execute(
    'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1',
    [google_id || null, normalizedEmail]
  );

  if (existing.length > 0) {
    const current = existing[0];
    await pool.execute(
      `UPDATE users SET google_id = ?, email = ?, name = ?, avatar_url = ?,
       access_token = COALESCE(?, access_token),
       refresh_token = COALESCE(?, refresh_token)
       WHERE id = ?`,
      [
        google_id || current.google_id,
        normalizedEmail,
        name || current.name,
        avatar_url || current.avatar_url,
        access_token || null,
        refresh_token || null,
        current.id
      ]
    );
    return getUserById(current.id);
  }

  const [res] = await pool.execute(
    `INSERT INTO users (google_id, email, name, avatar_url, role, access_token, refresh_token)
     VALUES (?, ?, ?, ?, 'STUDENT', ?, ?)`,
    [
      google_id || null,
      normalizedEmail,
      name || normalizedEmail,
      avatar_url || null,
      access_token || null,
      refresh_token || null
    ]
  );
  return getUserById(res.insertId);
}

export async function updateUserTokens(userId, { access_token, refresh_token }) {
  if (!isMySqlReady()) {
    const user = memoryStore.users.find((u) => u.id === Number(userId));
    if (user) {
      if (access_token) user.access_token = access_token;
      if (refresh_token) user.refresh_token = refresh_token;
    }
    return user || null;
  }
  await getPool().execute(
    `UPDATE users SET
      access_token = COALESCE(?, access_token),
      refresh_token = COALESCE(?, refresh_token)
     WHERE id = ?`,
    [access_token || null, refresh_token || null, Number(userId)]
  );
  return getUserById(userId);
}

export async function updateUserRole(userId, role) {
  const safeRole = role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';
  if (!isMySqlReady()) {
    const user = memoryStore.users.find((u) => u.id === Number(userId));
    if (user) user.role = safeRole;
    return user || null;
  }
  await getPool().execute('UPDATE users SET role = ? WHERE id = ?', [safeRole, Number(userId)]);
  return getUserById(userId);
}

export async function listProjectsForUser(user) {
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    const userEmail = user.email.toLowerCase();
    const matching = memoryStore.projects.filter((p) => {
      if (p.owner_id === user.id) return true;
      return memoryStore.project_members.some(
        (m) => m.project_id === p.id && m.user_email.toLowerCase() === userEmail
      );
    });
    return matching
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((p) => {
        const members = memoryStore.project_members.filter((m) => m.project_id === p.id);
        const files = memoryStore.project_files.filter((f) => f.project_id === p.id);
        const evals = memoryStore.ai_evaluations
          .filter((e) => e.project_id === p.id)
          .sort((a, b) => b.id - a.id);
        const latestEval = evals[0] || null;
        return {
          ...p,
          group_base_grade: Number(p.group_base_grade),
          member_count: members.length,
          file_count: files.length,
          latest_fairness_score: latestEval?.evaluation_json?.overall_fairness_score ?? null,
          latest_model_used: latestEval?.model_used ?? null,
          latest_evaluated_at: latestEval?.created_at ?? null
        };
      });
  }

  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT DISTINCT p.*,
      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) AS member_count,
      (SELECT COUNT(*) FROM project_files pf2 WHERE pf2.project_id = p.id) AS file_count,
      (SELECT ae.model_used FROM ai_evaluations ae WHERE ae.project_id = p.id ORDER BY ae.id DESC LIMIT 1) AS latest_model_used,
      (SELECT ae.evaluation_json FROM ai_evaluations ae WHERE ae.project_id = p.id ORDER BY ae.id DESC LIMIT 1) AS latest_eval_json,
      (SELECT ae.created_at FROM ai_evaluations ae WHERE ae.project_id = p.id ORDER BY ae.id DESC LIMIT 1) AS latest_evaluated_at
     FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id
     WHERE p.owner_id = ? OR pm.user_email = ?
     ORDER BY p.id ASC`,
    [Number(user.id), user.email.toLowerCase()]
  );

  return rows.map((row) => {
    const evalJson = parseJsonColumn(row.latest_eval_json);
    return {
      id: row.id,
      title: row.title,
      course_name: row.course_name,
      classroom_course_id: row.classroom_course_id,
      owner_id: row.owner_id,
      group_base_grade: Number(row.group_base_grade),
      status: row.status,
      created_at: toIsoStringOrNull(row.created_at),
      member_count: Number(row.member_count) || 0,
      file_count: Number(row.file_count) || 0,
      latest_fairness_score: evalJson?.overall_fairness_score ?? null,
      latest_model_used: row.latest_model_used || null,
      latest_evaluated_at: toIsoStringOrNull(row.latest_evaluated_at)
    };
  });
}

export async function createProject({
  title,
  course_name,
  classroom_course_id = null,
  owner_id,
  group_base_grade = 90,
  members = []
}) {
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    const project = {
      id: memoryStore.seq.projects++,
      title,
      course_name,
      classroom_course_id,
      owner_id: Number(owner_id),
      group_base_grade: Number(group_base_grade),
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    memoryStore.projects.push(project);

    for (const member of members) {
      if (!member?.user_email) continue;
      memoryStore.project_members.push({
        id: memoryStore.seq.project_members++,
        project_id: project.id,
        user_email: member.user_email.trim().toLowerCase(),
        user_name: (member.user_name || member.user_email).trim(),
        assigned_section: (member.assigned_section || 'General Contribution').trim(),
        is_leader: Boolean(member.is_leader)
      });
    }
    return getProjectDetails(project.id);
  }

  const pool = getPool();
  const [res] = await pool.execute(
    `INSERT INTO projects (title, course_name, classroom_course_id, owner_id, group_base_grade, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    [title, course_name, classroom_course_id, Number(owner_id), Number(group_base_grade)]
  );
  const projectId = res.insertId;

  for (const member of members) {
    if (!member?.user_email) continue;
    await pool.execute(
      `INSERT INTO project_members (project_id, user_email, user_name, assigned_section, is_leader)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), assigned_section = VALUES(assigned_section), is_leader = VALUES(is_leader)`,
      [
        projectId,
        member.user_email.trim().toLowerCase(),
        (member.user_name || member.user_email).trim(),
        (member.assigned_section || 'General Contribution').trim(),
        member.is_leader ? 1 : 0
      ]
    );
  }

  return getProjectDetails(projectId);
}

export async function getProjectDetails(projectId) {
  const pid = Number(projectId);
  if (!isMySqlReady()) {
    initMemoryDemoStore();
    const project = memoryStore.projects.find((p) => p.id === pid);
    if (!project) return null;

    const members = memoryStore.project_members.filter((m) => m.project_id === pid);
    const files = memoryStore.project_files.filter((f) => f.project_id === pid);
    const fileIds = new Set(files.map((f) => f.id));
    const revisionLogs = memoryStore.revision_logs.filter((r) => fileIds.has(r.project_file_id));
    const peerReviews = memoryStore.peer_reviews.filter((r) => r.project_id === pid);
    const evals = memoryStore.ai_evaluations
      .filter((e) => e.project_id === pid)
      .sort((a, b) => b.id - a.id);
    const latestEval = evals[0] || null;

    const filesWithRevisions = files.map((file) => ({
      ...file,
      revisions: revisionLogs.filter((r) => r.project_file_id === file.id)
    }));

    return {
      ...project,
      group_base_grade: Number(project.group_base_grade),
      members,
      files: filesWithRevisions,
      revision_logs: revisionLogs,
      peer_reviews: peerReviews,
      latest_evaluation: latestEval,
      member_drive_stats: computeMemberDriveStats(members, files, revisionLogs, peerReviews)
    };
  }

  const pool = getPool();
  const [projRows] = await pool.execute('SELECT * FROM projects WHERE id = ? LIMIT 1', [pid]);
  if (projRows.length === 0) return null;
  const project = projRows[0];

  const [memberRows] = await pool.execute(
    'SELECT * FROM project_members WHERE project_id = ? ORDER BY is_leader DESC, id ASC',
    [pid]
  );
  const [fileRows] = await pool.execute(
    'SELECT * FROM project_files WHERE project_id = ? ORDER BY id ASC',
    [pid]
  );

  let revisionRows = [];
  if (fileRows.length > 0) {
    const fileIds = fileRows.map((f) => f.id);
    const placeholders = fileIds.map(() => '?').join(',');
    const [revs] = await pool.execute(
      `SELECT * FROM revision_logs WHERE project_file_id IN (${placeholders}) ORDER BY revision_count DESC`,
      fileIds
    );
    revisionRows = revs.map((r) => ({
      ...r,
      revision_count: Number(r.revision_count) || 0,
      bytes_added: Number(r.bytes_added) || 0,
      active_days: Number(r.active_days) || 0,
      last_edit_at: toIsoStringOrNull(r.last_edit_at),
      raw_timeline_json: parseJsonColumn(r.raw_timeline_json) || []
    }));
  }

  const [reviewRows] = await pool.execute(
    'SELECT * FROM peer_reviews WHERE project_id = ? ORDER BY id DESC',
    [pid]
  );

  const [evalRows] = await pool.execute(
    'SELECT * FROM ai_evaluations WHERE project_id = ? ORDER BY id DESC LIMIT 1',
    [pid]
  );

  const members = memberRows.map((m) => ({
    ...m,
    is_leader: Boolean(m.is_leader)
  }));

  const files = fileRows.map((f) => ({
    ...f,
    last_synced_at: toIsoStringOrNull(f.last_synced_at),
    revisions: revisionRows.filter((r) => r.project_file_id === f.id)
  }));

  const peerReviews = reviewRows.map((r) => ({
    ...r,
    rating: Number(r.rating)
  }));

  const latestEvaluation = evalRows[0]
    ? {
        id: evalRows[0].id,
        project_id: evalRows[0].project_id,
        model_used: evalRows[0].model_used,
        evaluation_json: parseJsonColumn(evalRows[0].evaluation_json),
        created_at: toIsoStringOrNull(evalRows[0].created_at)
      }
    : null;

  return {
    id: project.id,
    title: project.title,
    course_name: project.course_name,
    classroom_course_id: project.classroom_course_id,
    owner_id: project.owner_id,
    group_base_grade: Number(project.group_base_grade),
    status: project.status,
    created_at: toIsoStringOrNull(project.created_at),
    members,
    files,
    revision_logs: revisionRows,
    peer_reviews: peerReviews,
    latest_evaluation: latestEvaluation,
    member_drive_stats: computeMemberDriveStats(members, files, revisionRows, peerReviews)
  };
}

export async function addProjectMember(projectId, { user_email, user_name, assigned_section, is_leader }) {
  const pid = Number(projectId);
  const email = user_email.trim().toLowerCase();
  const name = (user_name || email).trim();
  const section = (assigned_section || 'General Contribution').trim();
  const leader = Boolean(is_leader);

  if (!isMySqlReady()) {
    const existing = memoryStore.project_members.find(
      (m) => m.project_id === pid && m.user_email === email
    );
    if (existing) {
      existing.user_name = name;
      existing.assigned_section = section;
      existing.is_leader = leader;
      return existing;
    }
    const created = {
      id: memoryStore.seq.project_members++,
      project_id: pid,
      user_email: email,
      user_name: name,
      assigned_section: section,
      is_leader: leader
    };
    memoryStore.project_members.push(created);
    return created;
  }

  const pool = getPool();
  await pool.execute(
    `INSERT INTO project_members (project_id, user_email, user_name, assigned_section, is_leader)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), assigned_section = VALUES(assigned_section), is_leader = VALUES(is_leader)`,
    [pid, email, name, section, leader ? 1 : 0]
  );
  const [rows] = await pool.execute(
    'SELECT * FROM project_members WHERE project_id = ? AND user_email = ? LIMIT 1',
    [pid, email]
  );
  return { ...rows[0], is_leader: Boolean(rows[0].is_leader) };
}

export async function removeProjectMember(projectId, memberId) {
  const pid = Number(projectId);
  const mid = Number(memberId);
  if (!isMySqlReady()) {
    const idx = memoryStore.project_members.findIndex(
      (m) => m.project_id === pid && m.id === mid
    );
    if (idx === -1) return false;
    memoryStore.project_members.splice(idx, 1);
    return true;
  }
  const [res] = await getPool().execute(
    'DELETE FROM project_members WHERE project_id = ? AND id = ?',
    [pid, mid]
  );
  return res.affectedRows > 0;
}

export async function upsertProjectFile(
  projectId,
  { google_file_id, file_name, mime_type, web_view_link }
) {
  const pid = Number(projectId);
  const nowIso = new Date().toISOString();

  if (!isMySqlReady()) {
    const existing = memoryStore.project_files.find(
      (f) => f.project_id === pid && f.google_file_id === google_file_id
    );
    if (existing) {
      existing.file_name = file_name;
      existing.mime_type = mime_type;
      existing.web_view_link = web_view_link || existing.web_view_link;
      existing.last_synced_at = nowIso;
      return existing;
    }
    const created = {
      id: memoryStore.seq.project_files++,
      project_id: pid,
      google_file_id,
      file_name,
      mime_type,
      web_view_link: web_view_link || null,
      last_synced_at: nowIso
    };
    memoryStore.project_files.push(created);
    return created;
  }

  const pool = getPool();
  await pool.execute(
    `INSERT INTO project_files (project_id, google_file_id, file_name, mime_type, web_view_link, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       file_name = VALUES(file_name),
       mime_type = VALUES(mime_type),
       web_view_link = VALUES(web_view_link),
       last_synced_at = VALUES(last_synced_at)`,
    [pid, google_file_id, file_name, mime_type, web_view_link || null, toMysqlDateTime(nowIso)]
  );
  const [rows] = await pool.execute(
    'SELECT * FROM project_files WHERE project_id = ? AND google_file_id = ? LIMIT 1',
    [pid, google_file_id]
  );
  return { ...rows[0], last_synced_at: toIsoStringOrNull(rows[0].last_synced_at) };
}

export async function replaceFileRevisions(projectFileId, revisions) {
  const fid = Number(projectFileId);
  const nowIso = new Date().toISOString();

  if (!isMySqlReady()) {
    memoryStore.revision_logs = memoryStore.revision_logs.filter(
      (r) => r.project_file_id !== fid
    );
    const saved = [];
    for (const rev of revisions) {
      const item = {
        id: memoryStore.seq.revision_logs++,
        project_file_id: fid,
        contributor_email: rev.contributor_email.toLowerCase(),
        contributor_name: rev.contributor_name || rev.contributor_email,
        revision_count: Number(rev.revision_count) || 0,
        bytes_added: Number(rev.bytes_added) || 0,
        active_days: Number(rev.active_days) || 0,
        last_edit_at: rev.last_edit_at || nowIso,
        raw_timeline_json: rev.raw_timeline_json || []
      };
      memoryStore.revision_logs.push(item);
      saved.push(item);
    }
    const file = memoryStore.project_files.find((f) => f.id === fid);
    if (file) file.last_synced_at = nowIso;
    return saved;
  }

  const pool = getPool();
  await pool.execute('DELETE FROM revision_logs WHERE project_file_id = ?', [fid]);
  for (const rev of revisions) {
    await pool.execute(
      `INSERT INTO revision_logs
       (project_file_id, contributor_email, contributor_name, revision_count, bytes_added, active_days, last_edit_at, raw_timeline_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fid,
        rev.contributor_email.toLowerCase(),
        rev.contributor_name || rev.contributor_email,
        Number(rev.revision_count) || 0,
        Number(rev.bytes_added) || 0,
        Number(rev.active_days) || 0,
        toMysqlDateTime(rev.last_edit_at || nowIso),
        JSON.stringify(rev.raw_timeline_json || [])
      ]
    );
  }
  await pool.execute('UPDATE project_files SET last_synced_at = ? WHERE id = ?', [
    toMysqlDateTime(nowIso),
    fid
  ]);
  const [rows] = await pool.execute('SELECT * FROM revision_logs WHERE project_file_id = ?', [fid]);
  return rows.map((r) => ({
    ...r,
    last_edit_at: toIsoStringOrNull(r.last_edit_at),
    raw_timeline_json: parseJsonColumn(r.raw_timeline_json) || []
  }));
}

export async function removeProjectFile(projectId, fileId) {
  const pid = Number(projectId);
  const fid = Number(fileId);
  if (!isMySqlReady()) {
    const idx = memoryStore.project_files.findIndex(
      (f) => f.project_id === pid && f.id === fid
    );
    if (idx === -1) return false;
    memoryStore.project_files.splice(idx, 1);
    memoryStore.revision_logs = memoryStore.revision_logs.filter(
      (r) => r.project_file_id !== fid
    );
    return true;
  }
  const [res] = await getPool().execute(
    'DELETE FROM project_files WHERE project_id = ? AND id = ?',
    [pid, fid]
  );
  return res.affectedRows > 0;
}

export async function upsertPeerReview(
  projectId,
  { reviewer_email, reviewee_email, owned_task, rating, comment }
) {
  const pid = Number(projectId);
  const reviewer = reviewer_email.trim().toLowerCase();
  const reviewee = reviewee_email.trim().toLowerCase();
  const safeRating = Math.min(5, Math.max(1, Number(rating) || 3));

  if (!isMySqlReady()) {
    const existing = memoryStore.peer_reviews.find(
      (r) =>
        r.project_id === pid &&
        r.reviewer_email === reviewer &&
        r.reviewee_email === reviewee
    );
    if (existing) {
      existing.owned_task = owned_task;
      existing.rating = safeRating;
      existing.comment = comment || '';
      return existing;
    }
    const created = {
      id: memoryStore.seq.peer_reviews++,
      project_id: pid,
      reviewer_email: reviewer,
      reviewee_email: reviewee,
      owned_task,
      rating: safeRating,
      comment: comment || ''
    };
    memoryStore.peer_reviews.push(created);
    return created;
  }

  const pool = getPool();
  await pool.execute(
    `INSERT INTO peer_reviews (project_id, reviewer_email, reviewee_email, owned_task, rating, comment)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE owned_task = VALUES(owned_task), rating = VALUES(rating), comment = VALUES(comment)`,
    [pid, reviewer, reviewee, owned_task, safeRating, comment || '']
  );
  const [rows] = await pool.execute(
    'SELECT * FROM peer_reviews WHERE project_id = ? AND reviewer_email = ? AND reviewee_email = ? LIMIT 1',
    [pid, reviewer, reviewee]
  );
  return { ...rows[0], rating: Number(rows[0].rating) };
}

export async function saveAiEvaluation(projectId, modelUsed, evaluationJson) {
  const pid = Number(projectId);
  const nowIso = new Date().toISOString();

  if (!isMySqlReady()) {
    const record = {
      id: memoryStore.seq.ai_evaluations++,
      project_id: pid,
      model_used: modelUsed,
      evaluation_json: evaluationJson,
      created_at: nowIso
    };
    memoryStore.ai_evaluations.push(record);
    return record;
  }

  const pool = getPool();
  const [res] = await pool.execute(
    'INSERT INTO ai_evaluations (project_id, model_used, evaluation_json) VALUES (?, ?, ?)',
    [pid, modelUsed, JSON.stringify(evaluationJson)]
  );
  const [rows] = await pool.execute('SELECT * FROM ai_evaluations WHERE id = ? LIMIT 1', [
    res.insertId
  ]);
  return {
    id: rows[0].id,
    project_id: rows[0].project_id,
    model_used: rows[0].model_used,
    evaluation_json: parseJsonColumn(rows[0].evaluation_json),
    created_at: toIsoStringOrNull(rows[0].created_at)
  };
}

export async function getLatestAiEvaluation(projectId) {
  const pid = Number(projectId);
  if (!isMySqlReady()) {
    const matches = memoryStore.ai_evaluations
      .filter((e) => e.project_id === pid)
      .sort((a, b) => b.id - a.id);
    return matches[0] || null;
  }
  const [rows] = await getPool().execute(
    'SELECT * FROM ai_evaluations WHERE project_id = ? ORDER BY id DESC LIMIT 1',
    [pid]
  );
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    project_id: rows[0].project_id,
    model_used: rows[0].model_used,
    evaluation_json: parseJsonColumn(rows[0].evaluation_json),
    created_at: toIsoStringOrNull(rows[0].created_at)
  };
}

export async function updateProjectBaseGrade(projectId, grade) {
  const pid = Number(projectId);
  const safeGrade = Math.min(100, Math.max(0, Number(grade)));
  if (!isMySqlReady()) {
    const project = memoryStore.projects.find((p) => p.id === pid);
    if (!project) return null;
    project.group_base_grade = Number(safeGrade.toFixed(2));
    return getProjectDetails(pid);
  }
  await getPool().execute('UPDATE projects SET group_base_grade = ? WHERE id = ?', [
    safeGrade.toFixed(2),
    pid
  ]);
  return getProjectDetails(pid);
}
