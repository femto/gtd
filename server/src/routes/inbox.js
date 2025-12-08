import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all inbox items
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const items = db.prepare(`
      SELECT a.*,
        (SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ',')
         FROM action_tags at
         JOIN tags t ON at.tag_id = t.id
         WHERE at.action_id = a.id) as tags
      FROM actions a
      WHERE a.user_id = ? AND a.is_inbox = 1 AND a.status = 'active'
      ORDER BY a.created_at DESC
    `).all(req.user.id);

    // Parse tags
    const result = items.map(item => ({
      ...item,
      tags: item.tags ? item.tags.split(',').map(t => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    }));

    res.json(result);
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to get inbox items' });
  }
});

// Quick capture to inbox
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { title, notes, tagIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO actions (id, user_id, title, notes, is_inbox)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, req.user.id, title.trim(), notes || null);

    // Add tags if provided
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      const insertTag = db.prepare(`
        INSERT INTO action_tags (id, action_id, tag_id)
        VALUES (?, ?, ?)
      `);
      tagIds.forEach(tagId => {
        insertTag.run(uuidv4(), id, tagId);
      });
    }

    // Fetch item with tags
    const item = db.prepare(`
      SELECT a.*,
        (SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ',')
         FROM action_tags at
         JOIN tags t ON at.tag_id = t.id
         WHERE at.action_id = a.id) as tags
      FROM actions a
      WHERE a.id = ?
    `).get(id);

    const result = {
      ...item,
      tags: item.tags ? item.tags.split(',').map(t => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    };

    res.json(result);
  } catch (error) {
    console.error('Create inbox item error:', error);
    res.status(500).json({ error: 'Failed to create inbox item' });
  }
});

// Process inbox item (move out of inbox)
router.put('/:id/process', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { projectId, tagIds, deferDate, dueDate } = req.body;

    // Verify ownership
    const item = db.prepare('SELECT * FROM actions WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update the action
    db.prepare(`
      UPDATE actions
      SET is_inbox = 0,
          project_id = ?,
          defer_date = ?,
          due_date = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(projectId || null, deferDate || null, dueDate || null, id);

    // Handle tags
    if (tagIds && tagIds.length > 0) {
      // Remove existing tags
      db.prepare('DELETE FROM action_tags WHERE action_id = ?').run(id);

      // Add new tags
      const insertTag = db.prepare('INSERT INTO action_tags (id, action_id, tag_id) VALUES (?, ?, ?)');
      tagIds.forEach(tagId => {
        insertTag.run(uuidv4(), id, tagId);
      });
    }

    const updated = db.prepare('SELECT * FROM actions WHERE id = ?').get(id);

    // Get tags
    const tags = db.prepare(`
      SELECT t.id, t.name, t.color
      FROM action_tags at
      JOIN tags t ON at.tag_id = t.id
      WHERE at.action_id = ?
    `).all(id);

    res.json({ ...updated, tags });
  } catch (error) {
    console.error('Process inbox item error:', error);
    res.status(500).json({ error: 'Failed to process inbox item' });
  }
});

export default router;
