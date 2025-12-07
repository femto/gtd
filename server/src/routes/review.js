import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get projects due for review
router.get('/projects', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const projects = db.prepare(`
      SELECT p.*,
        f.name as folder_name,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'active') as active_action_count,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'completed') as completed_action_count
      FROM projects p
      LEFT JOIN folders f ON p.folder_id = f.id
      WHERE p.user_id = ?
        AND p.status = 'active'
        AND (p.next_review_at IS NULL OR date(p.next_review_at) <= date('now'))
      ORDER BY p.next_review_at ASC, p.created_at ASC
    `).all(req.user.id);

    res.json(projects);
  } catch (error) {
    console.error('Get review projects error:', error);
    res.status(500).json({ error: 'Failed to get projects for review' });
  }
});

// Get review stats
router.get('/stats', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stats = {
      projectsDueForReview: db.prepare(`
        SELECT COUNT(*) as count FROM projects
        WHERE user_id = ? AND status = 'active'
        AND (next_review_at IS NULL OR date(next_review_at) <= date('now'))
      `).get(req.user.id).count,

      projectsReviewedThisWeek: db.prepare(`
        SELECT COUNT(DISTINCT project_id) as count FROM reviews
        WHERE user_id = ? AND date(reviewed_at) >= date('now', '-7 days')
      `).get(req.user.id).count,

      totalActiveProjects: db.prepare(`
        SELECT COUNT(*) as count FROM projects
        WHERE user_id = ? AND status = 'active'
      `).get(req.user.id).count,

      inboxCount: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND is_inbox = 1 AND status = 'active'
      `).get(req.user.id).count,

      overdueActions: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'active' AND date(due_date) < date('now')
      `).get(req.user.id).count
    };

    res.json(stats);
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ error: 'Failed to get review stats' });
  }
});

export default router;
