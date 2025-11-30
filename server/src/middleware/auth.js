import { getDb } from '../db/index.js';

// Session-based authentication middleware
export function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.id as user_id, u.email, u.name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
  `).get(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  // Attach user to request
  req.user = {
    id: session.user_id,
    email: session.email,
    name: session.name
  };
  req.sessionId = sessionId;

  next();
}

// Optional auth - doesn't fail if not authenticated
export function optionalAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

  if (sessionId) {
    const db = getDb();
    const session = db.prepare(`
      SELECT s.*, u.id as user_id, u.email, u.name
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND datetime(s.expires_at) > datetime('now')
    `).get(sessionId);

    if (session) {
      req.user = {
        id: session.user_id,
        email: session.email,
        name: session.name
      };
      req.sessionId = sessionId;
    }
  }

  next();
}
