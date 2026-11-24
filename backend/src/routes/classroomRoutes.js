import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getAuthorizedClientForUser,
  listClassroomCourses,
  listCourseRoster,
  SAMPLE_CLASSROOM_COURSES
} from '../services/googleService.js';

const router = Router();

router.use(requireAuth);

router.get('/courses', async (req, res) => {
  try {
    const oauthClient = getAuthorizedClientForUser(req.user);
    const result = await listClassroomCourses(oauthClient);
    res.json(result);
  } catch (error) {
    res.json({
      courses: SAMPLE_CLASSROOM_COURSES,
      source: 'fallback-sample',
      fallbackRequired: true,
      warning: `Google Classroom fallback active: ${error.message}`
    });
  }
});

router.get('/courses/:courseId/roster', async (req, res) => {
  try {
    const oauthClient = getAuthorizedClientForUser(req.user);
    const result = await listCourseRoster(oauthClient, req.params.courseId);
    res.json(result);
  } catch (error) {
    res.json({
      courseId: req.params.courseId,
      students: [],
      source: 'fallback-manual',
      fallbackRequired: true,
      warning: error.message
    });
  }
});

export default router;
