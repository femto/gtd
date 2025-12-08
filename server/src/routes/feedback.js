import express from 'express';
import { getDb } from '../db/index.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// Submit feedback (public endpoint, no auth required)
router.post('/', async (req, res) => {
  try {
    const { type, title, description, email, userAgent, url } = req.body;

    // Validation
    if (!type || !['bug', 'feature', 'comment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const db = getDb();
    const id = randomUUID();

    db.prepare(`
      INSERT INTO feedback (id, type, title, description, email, user_agent, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, title.trim(), description.trim(), email || null, userAgent || null, url || null);

    res.status(201).json({
      id,
      type,
      title: title.trim(),
      description: description.trim(),
      email,
      status: 'new',
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get all feedback (admin endpoint)
router.get('/', async (req, res) => {
  try {
    const { status, type } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const feedback = db.prepare(query).all(...params);

    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get feedback stats
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();

    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM feedback').get().count,
      by_status: {},
      by_type: {},
      recent: db.prepare('SELECT COUNT(*) as count FROM feedback WHERE created_at >= datetime("now", "-7 days")').get().count
    };

    // Count by status
    const statusCounts = db.prepare('SELECT status, COUNT(*) as count FROM feedback GROUP BY status').all();
    statusCounts.forEach(row => {
      stats.by_status[row.status] = row.count;
    });

    // Count by type
    const typeCounts = db.prepare('SELECT type, COUNT(*) as count FROM feedback GROUP BY type').all();
    typeCounts.forEach(row => {
      stats.by_type[row.type] = row.count;
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Update feedback status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (status && !['new', 'reviewed', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const db = getDb();

    // Check if feedback exists
    const feedback = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Update feedback
    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);

      if (status === 'resolved' && feedback.status !== 'resolved') {
        updates.push('resolved_at = datetime("now")');
      }
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    // Return updated feedback
    const updated = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

// Delete feedback
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const result = db.prepare('DELETE FROM feedback WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

export default router;
