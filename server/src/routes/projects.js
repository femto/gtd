import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all projects
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { folderId, status } = req.query;

    let query = `
      SELECT p.*,
        f.name as folder_name,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'active') as active_action_count,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'completed') as completed_action_count
      FROM projects p
      LEFT JOIN folders f ON p.folder_id = f.id
      WHERE p.user_id = ?
    `;
    const params = [req.user.id];

    if (folderId) {
      query += ' AND p.folder_id = ?';
      params.push(folderId);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.position ASC, p.created_at DESC';

    const projects = db.prepare(query).all(...params);
    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

// Create project
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, notes, folderId, type, dueDate, reviewInterval } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const id = uuidv4();

    // Set review interval (default 7 days)
    const interval = reviewInterval || 7;
    // New projects should be due for review immediately (next_review_at = today)
    const nextReview = new Date().toISOString().split('T')[0];

    // Get max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max FROM projects WHERE user_id = ? AND folder_id IS ?
    `).get(req.user.id, folderId || null);

    db.prepare(`
      INSERT INTO projects (id, user_id, name, notes, folder_id, type, due_date, review_interval, next_review_at, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user.id, name.trim(), notes || null, folderId || null,
      type || 'parallel', dueDate || null, interval, nextReview,
      (maxPos?.max || 0) + 1
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json({ ...project, active_action_count: 0, completed_action_count: 0 });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Get single project
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const project = db.prepare(`
      SELECT p.*, f.name as folder_name,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'active') as active_action_count,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'completed') as completed_action_count
      FROM projects p
      LEFT JOIN folders f ON p.folder_id = f.id
      WHERE p.id = ? AND p.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Update project
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, notes, folderId, type, dueDate, reviewInterval, status, nextReviewAt } = req.body;

    // Verify ownership
    const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const updates = ['updated_at = datetime("now")'];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (folderId !== undefined) {
      updates.push('folder_id = ?');
      params.push(folderId);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      params.push(type);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dueDate);
    }
    if (reviewInterval !== undefined) {
      updates.push('review_interval = ?');
      params.push(reviewInterval);
    }
    if (nextReviewAt !== undefined) {
      updates.push('next_review_at = ?');
      params.push(nextReviewAt);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
      if (status === 'completed') {
        updates.push('completed_at = datetime("now")');
      } else if (status === 'dropped') {
        updates.push('dropped_at = datetime("now")');
      }
    }

    params.push(id);
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const project = db.prepare(`
      SELECT p.*, f.name as folder_name,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'active') as active_action_count,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'completed') as completed_action_count
      FROM projects p
      LEFT JOIN folders f ON p.folder_id = f.id
      WHERE p.id = ?
    `).get(id);

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    // Move all actions to inbox first
    db.prepare(`
      UPDATE actions SET project_id = NULL, is_inbox = 1 WHERE project_id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    const result = db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Update project status
router.put('/:id/status', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['active', 'on_hold', 'completed', 'dropped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let additionalUpdates = '';
    if (status === 'completed') {
      additionalUpdates = ', completed_at = datetime("now")';
    } else if (status === 'dropped') {
      additionalUpdates = ', dropped_at = datetime("now")';
    }

    db.prepare(`
      UPDATE projects
      SET status = ?, updated_at = datetime('now')${additionalUpdates}
      WHERE id = ?
    `).run(status, id);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ error: 'Failed to update project status' });
  }
});

// Mark project as reviewed
router.put('/:id/review', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { notes } = req.body;

    const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Calculate next review date
    const nextReview = new Date(Date.now() + existing.review_interval * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    db.prepare(`
      UPDATE projects
      SET last_reviewed_at = datetime('now'), next_review_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(nextReview, id);

    // Log the review
    db.prepare(`
      INSERT INTO reviews (id, user_id, project_id, notes)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), req.user.id, id, notes || null);

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  } catch (error) {
    console.error('Review project error:', error);
    res.status(500).json({ error: 'Failed to review project' });
  }
});

// Get project actions
router.get('/:id/actions', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.query;

    // Verify ownership
    const project = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let query = `
      SELECT a.*,
        (SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ',')
         FROM action_tags at
         JOIN tags t ON at.tag_id = t.id
         WHERE at.action_id = a.id) as tags
      FROM actions a
      WHERE a.project_id = ? AND a.user_id = ?
    `;
    const params = [id, req.user.id];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.position ASC';

    const actions = db.prepare(query).all(...params);

    const result = actions.map(action => ({
      ...action,
      is_flagged: Boolean(action.is_flagged),
      tags: action.tags ? action.tags.split(',').map(t => {
        const [tagId, name, color] = t.split(':');
        return { id: tagId, name, color };
      }) : []
    }));

    res.json(result);
  } catch (error) {
    console.error('Get project actions error:', error);
    res.status(500).json({ error: 'Failed to get project actions' });
  }
});

// Reorder projects
router.put('/reorder', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { projectIds } = req.body;

    if (!projectIds || !Array.isArray(projectIds)) {
      return res.status(400).json({ error: 'projectIds array is required' });
    }

    const updateStmt = db.prepare('UPDATE projects SET position = ? WHERE id = ? AND user_id = ?');

    projectIds.forEach((id, index) => {
      updateStmt.run(index, id, req.user.id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder projects error:', error);
    res.status(500).json({ error: 'Failed to reorder projects' });
  }
});

export default router;
