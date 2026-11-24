import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  addProjectMember,
  createProject,
  getProjectDetails,
  listProjectsForUser,
  removeProjectFile,
  removeProjectMember,
  replaceFileRevisions,
  saveAiEvaluation,
  updateProjectBaseGrade,
  upsertPeerReview,
  upsertProjectFile
} from '../db/repository.js';
import {
  extractFileRevisions,
  generateSimulatedRevisionsForFile,
  getAuthorizedClientForUser
} from '../services/googleService.js';
import { runContributionAnalysis } from '../services/geminiService.js';

const router = Router();

router.use(requireAuth);

async function loadAuthorizedProject(projectId, user) {
  const project = await getProjectDetails(projectId);
  if (!project) {
    const error = new Error('Project not found');
    error.status = 404;
    throw error;
  }
  const userEmail = user.email.toLowerCase();
  const isMember = project.members.some((m) => m.user_email.toLowerCase() === userEmail);
  if (project.owner_id !== user.id && !isMember && user.role !== 'INSTRUCTOR') {
    const error = new Error('Access denied for this project');
    error.status = 403;
    throw error;
  }
  return project;
}

async function syncSingleFileRevisions(oauthClient, project, fileRecord) {
  const isDemoFile =
    fileRecord.google_file_id.startsWith('demo-') ||
    fileRecord.google_file_id.startsWith('sim-');

  if (oauthClient && !isDemoFile) {
    try {
      const extracted = await extractFileRevisions(oauthClient, fileRecord.google_file_id);
      await replaceFileRevisions(fileRecord.id, extracted.revisions);
      return 'google-drive-v3';
    } catch (err) {
      console.warn(
        `[DriveSync] Live Drive extraction failed for ${fileRecord.google_file_id}: ${err.message}. Falling back to simulated telemetry.`
      );
    }
  }

  const simulated = generateSimulatedRevisionsForFile(fileRecord, project.members);
  await replaceFileRevisions(fileRecord.id, simulated);
  return 'simulated-demo-telemetry';
}

router.get('/', async (req, res, next) => {
  try {
    const projects = await listProjectsForUser(req.user);
    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const title = String(req.body?.title || '').trim();
    const courseName = String(req.body?.course_name || '').trim();
    const classroomCourseId = req.body?.classroom_course_id || null;
    const baseGrade =
      req.body?.group_base_grade !== undefined ? Number(req.body.group_base_grade) : 90;

    if (!title || !courseName) {
      return res.status(400).json({ error: 'Project title and course_name are required.' });
    }

    const incomingMembers = Array.isArray(req.body?.members) ? req.body.members : [];
    const normalizedMembers = incomingMembers
      .filter((m) => m?.user_email && String(m.user_email).trim())
      .map((m) => ({
        user_email: String(m.user_email).trim().toLowerCase(),
        user_name: String(m.user_name || m.user_email).trim(),
        assigned_section: String(m.assigned_section || 'General Contribution').trim(),
        is_leader: Boolean(m.is_leader)
      }));

    const ownerEmail = req.user.email.toLowerCase();
    if (!normalizedMembers.some((m) => m.user_email === ownerEmail)) {
      normalizedMembers.unshift({
        user_email: ownerEmail,
        user_name: req.user.name,
        assigned_section: 'Team Coordination & Integration',
        is_leader: true
      });
    }

    const project = await createProject({
      title,
      course_name: courseName,
      classroom_course_id: classroomCourseId,
      owner_id: req.user.id,
      group_base_grade: Number.isNaN(baseGrade) ? 90 : Math.min(100, Math.max(0, baseGrade)),
      members: normalizedMembers
    });

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const userEmail = String(req.body?.user_email || '').trim().toLowerCase();
    if (!userEmail) {
      return res.status(400).json({ error: 'user_email is required' });
    }
    await addProjectMember(project.id, {
      user_email: userEmail,
      user_name: req.body?.user_name || userEmail,
      assigned_section: req.body?.assigned_section || 'General Contribution',
      is_leader: Boolean(req.body?.is_leader)
    });
    const updated = await getProjectDetails(project.id);
    res.status(201).json({ project: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:memberId', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    await removeProjectMember(project.id, req.params.memberId);
    const updated = await getProjectDetails(project.id);
    res.json({ project: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/files', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const incomingList = Array.isArray(req.body?.files)
      ? req.body.files
      : req.body?.google_file_id
        ? [req.body]
        : [];

    if (incomingList.length === 0) {
      return res.status(400).json({ error: 'At least one Google Drive file payload is required.' });
    }

    const oauthClient = getAuthorizedClientForUser(req.user);
    const syncSources = [];

    for (const item of incomingList) {
      if (!item?.google_file_id || !item?.file_name) continue;
      const savedFile = await upsertProjectFile(project.id, {
        google_file_id: String(item.google_file_id),
        file_name: String(item.file_name),
        mime_type: String(item.mime_type || 'application/vnd.google-apps.document'),
        web_view_link: item.web_view_link || null
      });
      const source = await syncSingleFileRevisions(
        item.simulated ? null : oauthClient,
        project,
        savedFile
      );
      syncSources.push({ fileId: savedFile.id, fileName: savedFile.file_name, source });
    }

    const updated = await getProjectDetails(project.id);
    res.status(201).json({ project: updated, syncedFiles: syncSources });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/files/:fileId/sync', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const targetFile = project.files.find((f) => f.id === Number(req.params.fileId));
    if (!targetFile) {
      return res.status(404).json({ error: 'Attached Drive file not found.' });
    }
    const oauthClient = getAuthorizedClientForUser(req.user);
    const syncSource = await syncSingleFileRevisions(oauthClient, project, targetFile);
    const updated = await getProjectDetails(project.id);
    res.json({ project: updated, syncSource });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/sync-all', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const oauthClient = getAuthorizedClientForUser(req.user);
    const syncedFiles = [];
    for (const file of project.files) {
      const source = await syncSingleFileRevisions(oauthClient, project, file);
      syncedFiles.push({ fileId: file.id, fileName: file.file_name, source });
    }
    const updated = await getProjectDetails(project.id);
    res.json({ project: updated, syncedFiles });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/files/:fileId', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    await removeProjectFile(project.id, req.params.fileId);
    const updated = await getProjectDetails(project.id);
    res.json({ project: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/peer-reviews', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const reviewerEmail = String(req.body?.reviewer_email || req.user.email).trim().toLowerCase();
    const revieweeEmail = String(req.body?.reviewee_email || '').trim().toLowerCase();
    const ownedTask = String(req.body?.owned_task || '').trim();
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || '').trim();

    if (!revieweeEmail || !ownedTask || Number.isNaN(rating)) {
      return res.status(400).json({
        error: 'reviewee_email, owned_task, and rating (1-5) are required.'
      });
    }

    await upsertPeerReview(project.id, {
      reviewer_email: reviewerEmail,
      reviewee_email: revieweeEmail,
      owned_task: ownedTask,
      rating,
      comment
    });

    const updated = await getProjectDetails(project.id);
    res.status(201).json({ project: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/analyze', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const forceRefresh = Boolean(req.body?.forceRefresh) || req.query.force === 'true';

    if (!forceRefresh && project.latest_evaluation) {
      return res.json({
        evaluation: project.latest_evaluation,
        cached: true,
        fallbackReason: null,
        project
      });
    }

    const { modelUsed, fallbackReason, evaluation } = await runContributionAnalysis(project);
    const saved = await saveAiEvaluation(project.id, modelUsed, evaluation);
    const updatedProject = await getProjectDetails(project.id);

    res.json({
      evaluation: saved,
      cached: false,
      fallbackReason,
      project: updatedProject
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/grade', async (req, res, next) => {
  try {
    const project = await loadAuthorizedProject(req.params.id, req.user);
    const grade = Number(req.body?.group_base_grade);
    if (Number.isNaN(grade) || grade < 0 || grade > 100) {
      return res.status(400).json({ error: 'group_base_grade must be a number between 0 and 100.' });
    }
    const updated = await updateProjectBaseGrade(project.id, grade);
    res.json({ project: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
