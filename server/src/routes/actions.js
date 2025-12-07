import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all actions (with filters)
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { projectId, status, flagged, tagId, dueDate, includeInbox } = req.query;

    let query = `
      SELECT a.*,
        p.name as project_name,
        (SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ',')
         FROM action_tags at
         JOIN tags t ON at.tag_id = t.id
         WHERE at.action_id = a.id) as tags
      FROM actions a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.user_id = ?
    `;
    const params = [req.user.id];

    // Exclude inbox items by default
    if (!includeInbox || includeInbox === 'false') {
      query += ' AND a.is_inbox = 0';
    }

    if (projectId) {
      query += ' AND a.project_id = ?';
      params.push(projectId);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    } else {
      query += ' AND a.status = "active"';
    }

    if (flagged === 'true') {
      query += ' AND a.is_flagged = 1';
    }

    if (tagId) {
      query += ` AND a.id IN (SELECT action_id FROM action_tags WHERE tag_id = ?)`;
      params.push(tagId);
    }

    if (dueDate) {
      query += ' AND date(a.due_date) = date(?)';
      params.push(dueDate);
    }

    query += ' ORDER BY a.position ASC, a.created_at DESC';

    const actions = db.prepare(query).all(...params);

    // Parse tags
    const result = actions.map(action => ({
      ...action,
      is_flagged: Boolean(action.is_flagged),
      tags: action.tags ? action.tags.split(',').map(t => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    }));

    res.json(result);
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ error: 'Failed to get actions' });
  }
});

// Create action
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const {
      title, notes, projectId, deferDate, dueDate,
      estimatedMinutes, isInbox, tagIds
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = uuidv4();
    const inbox = isInbox !== false && !projectId ? 1 : 0;

    // Get max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max FROM actions WHERE user_id = ? AND project_id IS ?
    `).get(req.user.id, projectId || null);

    db.prepare(`
      INSERT INTO actions (id, user_id, title, notes, project_id, defer_date, due_date, estimated_minutes, is_inbox, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.user.id, title.trim(), notes || null, projectId || null,
      deferDate || null, dueDate || null, estimatedMinutes || null,
      inbox, (maxPos?.max || 0) + 1
    );

    // Add tags
    if (tagIds && tagIds.length > 0) {
      const insertTag = db.prepare('INSERT INTO action_tags (id, action_id, tag_id) VALUES (?, ?, ?)');
      tagIds.forEach(tagId => {
        insertTag.run(uuidv4(), id, tagId);
      });
    }

    const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM action_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.action_id = ?
    `).all(id);

    res.json({ ...action, is_flagged: Boolean(action.is_flagged), tags });
  } catch (error) {
    console.error('Create action error:', error);
    res.status(500).json({ error: 'Failed to create action' });
  }
});

// Get single action
router.get('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const action = db.prepare(`
      SELECT a.*, p.name as project_name
      FROM actions a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.id = ? AND a.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM action_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.action_id = ?
    `).all(req.params.id);

    res.json({ ...action, is_flagged: Boolean(action.is_flagged), tags });
  } catch (error) {
    console.error('Get action error:', error);
    res.status(500).json({ error: 'Failed to get action' });
  }
});

// Update action
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { title, notes, projectId, deferDate, dueDate, estimatedMinutes, tagIds } = req.body;

    // Verify ownership
    const existing = db.prepare('SELECT * FROM actions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const updates = ['updated_at = datetime("now")'];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title.trim());
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (projectId !== undefined) {
      updates.push('project_id = ?');
      params.push(projectId);
      // If assigning to project, remove from inbox
      if (projectId) {
        updates.push('is_inbox = 0');
      }
    }
    if (deferDate !== undefined) {
      updates.push('defer_date = ?');
      params.push(deferDate);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(dueDate);
    }
    if (estimatedMinutes !== undefined) {
      updates.push('estimated_minutes = ?');
      params.push(estimatedMinutes);
    }

    params.push(id);
    db.prepare(`UPDATE actions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Handle tags
    if (tagIds !== undefined) {
      db.prepare('DELETE FROM action_tags WHERE action_id = ?').run(id);
      if (tagIds.length > 0) {
        const insertTag = db.prepare('INSERT INTO action_tags (id, action_id, tag_id) VALUES (?, ?, ?)');
        tagIds.forEach(tagId => {
          insertTag.run(uuidv4(), id, tagId);
        });
      }
    }

    const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM action_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.action_id = ?
    `).all(id);

    res.json({ ...action, is_flagged: Boolean(action.is_flagged), tags });
  } catch (error) {
    console.error('Update action error:', error);
    res.status(500).json({ error: 'Failed to update action' });
  }
});

// Delete action
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM actions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete action error:', error);
    res.status(500).json({ error: 'Failed to delete action' });
  }
});

// Complete action
router.put('/:id/complete', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM actions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' });
    }

    db.prepare(`
      UPDATE actions
      SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    res.json({ ...action, is_flagged: Boolean(action.is_flagged) });
  } catch (error) {
    console.error('Complete action error:', error);
    res.status(500).json({ error: 'Failed to complete action' });
  }
});

// Uncomplete action
router.put('/:id/uncomplete', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM actions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' });
    }

    db.prepare(`
      UPDATE actions
      SET status = 'active', completed_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    res.json({ ...action, is_flagged: Boolean(action.is_flagged) });
  } catch (error) {
    console.error('Uncomplete action error:', error);
    res.status(500).json({ error: 'Failed to uncomplete action' });
  }
});

// Flag action
router.put('/:id/flag', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM actions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' });
    }

    db.prepare(`
      UPDATE actions
      SET is_flagged = 1, flag_date = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    res.json({ ...action, is_flagged: true });
  } catch (error) {
    console.error('Flag action error:', error);
    res.status(500).json({ error: 'Failed to flag action' });
  }
});

// Unflag action
router.put('/:id/unflag', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM actions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' });
    }

    db.prepare(`
      UPDATE actions
      SET is_flagged = 0, flag_date = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    const action = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);
    res.json({ ...action, is_flagged: false });
  } catch (error) {
    console.error('Unflag action error:', error);
    res.status(500).json({ error: 'Failed to unflag action' });
  }
});

// Reorder actions
router.put('/reorder', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { actionIds } = req.body;

    if (!actionIds || !Array.isArray(actionIds)) {
      return res.status(400).json({ error: 'actionIds array is required' });
    }

    const updateStmt = db.prepare('UPDATE actions SET position = ? WHERE id = ? AND user_id = ?');

    actionIds.forEach((id, index) => {
      updateStmt.run(index, id, req.user.id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder actions error:', error);
    res.status(500).json({ error: 'Failed to reorder actions' });
  }
});

export default router;
