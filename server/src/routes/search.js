import { Router } from 'express';
import { getDb } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Global search
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ actions: [], projects: [] });
    }

    const searchTerm = `%${q.trim()}%`;

    // Search actions
    const actions = db.prepare(`
      SELECT a.*,
        p.name as project_name,
        (SELECT GROUP_CONCAT(t.id || ':' || t.name || ':' || t.color, ',')
         FROM action_tags at
         JOIN tags t ON at.tag_id = t.id
         WHERE at.action_id = a.id) as tags
      FROM actions a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.user_id = ?
        AND a.status = 'active'
        AND (a.title LIKE ? OR a.notes LIKE ?)
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all(req.user.id, searchTerm, searchTerm);

    // Search projects
    const projects = db.prepare(`
      SELECT p.*,
        f.name as folder_name,
        (SELECT COUNT(*) FROM actions a WHERE a.project_id = p.id AND a.status = 'active') as active_action_count
      FROM projects p
      LEFT JOIN folders f ON p.folder_id = f.id
      WHERE p.user_id = ?
        AND p.status = 'active'
        AND (p.name LIKE ? OR p.notes LIKE ?)
      ORDER BY p.created_at DESC
      LIMIT 20
    `).all(req.user.id, searchTerm, searchTerm);

    // Parse action tags
    const actionResults = actions.map(action => ({
      ...action,
      is_flagged: Boolean(action.is_flagged),
      tags: action.tags ? action.tags.split(',').map(t => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    }));

    res.json({ actions: actionResults, projects });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Advanced search with filters
router.get('/advanced', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { status, flagged, tagId, projectId, dueFrom, dueTo, deferFrom, deferTo } = req.query;

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

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (flagged === 'true') {
      query += ' AND a.is_flagged = 1';
    }

    if (tagId) {
      query += ' AND a.id IN (SELECT action_id FROM action_tags WHERE tag_id = ?)';
      params.push(tagId);
    }

    if (projectId) {
      query += ' AND a.project_id = ?';
      params.push(projectId);
    }

    if (dueFrom) {
      query += ' AND date(a.due_date) >= date(?)';
      params.push(dueFrom);
    }

    if (dueTo) {
      query += ' AND date(a.due_date) <= date(?)';
      params.push(dueTo);
    }

    if (deferFrom) {
      query += ' AND date(a.defer_date) >= date(?)';
      params.push(deferFrom);
    }

    if (deferTo) {
      query += ' AND date(a.defer_date) <= date(?)';
      params.push(deferTo);
    }

    query += ' ORDER BY a.due_date ASC NULLS LAST, a.position ASC LIMIT 100';

    const actions = db.prepare(query).all(...params);

    const results = actions.map(action => ({
      ...action,
      is_flagged: Boolean(action.is_flagged),
      tags: action.tags ? action.tags.split(',').map(t => {
        const [id, name, color] = t.split(':');
        return { id, name, color };
      }) : []
    }));

    res.json(results);
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
