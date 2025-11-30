import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all folders
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const folders = db.prepare(`
      SELECT f.*,
        (SELECT COUNT(*) FROM projects p WHERE p.folder_id = f.id AND p.status = 'active') as project_count
      FROM folders f
      WHERE f.user_id = ?
      ORDER BY f.position ASC, f.created_at ASC
    `).all(req.user.id);

    res.json(folders);
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to get folders' });
  }
});

// Create folder
router.post('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, color, parentFolderId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const id = uuidv4();

    // Get max position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM folders WHERE user_id = ?').get(req.user.id);

    db.prepare(`
      INSERT INTO folders (id, user_id, name, color, parent_folder_id, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name.trim(), color || '#6B7280', parentFolderId || null, (maxPos?.max || 0) + 1);

    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
    res.json({ ...folder, project_count: 0 });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Update folder
router.put('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, color, parentFolderId, isCollapsed } = req.body;

    // Verify ownership
    const existing = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const updates = ['updated_at = datetime("now")'];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (parentFolderId !== undefined) {
      updates.push('parent_folder_id = ?');
      params.push(parentFolderId);
    }
    if (isCollapsed !== undefined) {
      updates.push('is_collapsed = ?');
      params.push(isCollapsed ? 1 : 0);
    }

    params.push(id);
    db.prepare(`UPDATE folders SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const folder = db.prepare(`
      SELECT f.*,
        (SELECT COUNT(*) FROM projects p WHERE p.folder_id = f.id AND p.status = 'active') as project_count
      FROM folders f WHERE f.id = ?
    `).get(id);

    res.json(folder);
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

// Delete folder
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    // Move projects out of folder
    db.prepare('UPDATE projects SET folder_id = NULL WHERE folder_id = ? AND user_id = ?').run(req.params.id, req.user.id);

    const result = db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

// Reorder folders
router.put('/reorder', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { folderIds } = req.body;

    if (!folderIds || !Array.isArray(folderIds)) {
      return res.status(400).json({ error: 'folderIds array is required' });
    }

    const updateStmt = db.prepare('UPDATE folders SET position = ? WHERE id = ? AND user_id = ?');

    folderIds.forEach((id, index) => {
      updateStmt.run(index, id, req.user.id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Reorder folders error:', error);
    res.status(500).json({ error: 'Failed to reorder folders' });
  }
});

export default router;
