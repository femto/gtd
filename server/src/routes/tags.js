import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all tags
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const tags = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM action_tags at
         JOIN actions a ON at.action_id = a.id
         WHERE at.tag_id = t.id AND a.status = 'active') as action_count
      FROM tags t
      WHERE t.user_id = ?
      ORDER BY t.position ASC, t.created_at ASC
    `).all(req.user.id);

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// Create tag
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, color, icon, parentTagId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const id = uuidv4();

    // Get max position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM tags WHERE user_id = ?').get(req.user.id);

    db.prepare(`
      INSERT INTO tags (id, user_id, name, color, icon, parent_tag_id, position)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name.trim(), color || '#7C3AED', icon || null, parentTagId || null, (maxPos?.max || 0) + 1);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    res.json({ ...tag, action_count: 0 });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, color, icon, parentTagId } = req.body;

    // Verify ownership
    const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    if (parentTagId !== undefined) {
      updates.push('parent_tag_id = ?');
      params.push(parentTagId);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const tag = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM action_tags at
         JOIN actions a ON at.action_id = a.id
         WHERE at.tag_id = t.id AND a.status = 'active') as action_count
      FROM tags t WHERE t.id = ?
    `).get(id);

    res.json(tag);
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// Delete tag
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// Reorder tags
router.put('/reorder', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { tagIds } = req.body;

    if (!tagIds || !Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds array is required' });
    }

    const updateStmt = db.prepare('UPDATE tags SET position = ? WHERE id = ? AND user_id = ?');

    tagIds.forEach((id, index) => {
      updateStmt.run(index, id, req.user.id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder tags error:', error);
    res.status(500).json({ error: 'Failed to reorder tags' });
  }
});

// Get actions by tag
router.get('/:id/actions', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // Verify ownership
    const tag = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    const actions = db.prepare(`
      SELECT a.*,
        p.name as project_name,
        (SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ',')
         FROM action_tags at2
         JOIN tags t ON at2.tag_id = t.id
         WHERE at2.action_id = a.id) as tags
      FROM actions a
      JOIN action_tags at ON a.id = at.action_id
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE at.tag_id = ? AND a.user_id = ? AND a.status = 'active'
      ORDER BY a.position ASC
    `).all(id, req.user.id);

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
    console.error('Get tag actions error:', error);
    res.status(500).json({ error: 'Failed to get tag actions' });
  }
});

export default router;
