import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get overview stats
router.get('/overview', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stats = {
      inbox: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND is_inbox = 1 AND status = 'active'
      `).get(req.user.id).count,

      dueToday: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'active' AND date(due_date) = date('now')
      `).get(req.user.id).count,

      overdue: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'active' AND date(due_date) < date('now')
      `).get(req.user.id).count,

      flagged: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'active' AND is_flagged = 1
      `).get(req.user.id).count,

      activeActions: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'active'
      `).get(req.user.id).count,

      activeProjects: db.prepare(`
        SELECT COUNT(*) as count FROM projects
        WHERE user_id = ? AND status = 'active'
      `).get(req.user.id).count,

      projectsForReview: db.prepare(`
        SELECT COUNT(*) as count FROM projects
        WHERE user_id = ? AND status = 'active'
        AND (next_review_at IS NULL OR date(next_review_at) <= date('now'))
      `).get(req.user.id).count,

      completedToday: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'completed' AND date(completed_at) = date('now')
      `).get(req.user.id).count
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get completed actions history
router.get('/completed', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { days = 30 } = req.query;

    const completed = db.prepare(`
      SELECT date(completed_at) as date, COUNT(*) as count
      FROM actions
      WHERE user_id = ? AND status = 'completed'
        AND date(completed_at) >= date('now', '-' || ? || ' days')
      GROUP BY date(completed_at)
      ORDER BY date(completed_at) ASC
    `).all(req.user.id, days);

    res.json(completed);
  } catch (error) {
    console.error('Get completed stats error:', error);
    res.status(500).json({ error: 'Failed to get completed stats' });
  }
});

// Get productivity stats
router.get('/productivity', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const stats = {
      completedThisWeek: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'completed'
        AND date(completed_at) >= date('now', '-7 days')
      `).get(req.user.id).count,

      completedThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND status = 'completed'
        AND date(completed_at) >= date('now', '-30 days')
      `).get(req.user.id).count,

      createdThisWeek: db.prepare(`
        SELECT COUNT(*) as count FROM actions
        WHERE user_id = ? AND date(created_at) >= date('now', '-7 days')
      `).get(req.user.id).count,

      projectsCompletedThisMonth: db.prepare(`
        SELECT COUNT(*) as count FROM projects
        WHERE user_id = ? AND status = 'completed'
        AND date(completed_at) >= date('now', '-30 days')
      `).get(req.user.id).count,

      avgActionsPerProject: db.prepare(`
        SELECT AVG(cnt) as avg FROM (
          SELECT COUNT(*) as cnt FROM actions
          WHERE user_id = ? AND project_id IS NOT NULL
          GROUP BY project_id
        )
      `).get(req.user.id).avg || 0,

      mostUsedTags: db.prepare(`
        SELECT t.name, t.color, COUNT(*) as count
        FROM action_tags at
        JOIN tags t ON at.tag_id = t.id
        JOIN actions a ON at.action_id = a.id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY count DESC
        LIMIT 5
      `).all(req.user.id)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get productivity stats error:', error);
    res.status(500).json({ error: 'Failed to get productivity stats' });
  }
});

export default router;
