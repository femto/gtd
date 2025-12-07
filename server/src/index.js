import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import inboxRoutes from './routes/inbox.js';
import actionsRoutes from './routes/actions.js';
import projectsRoutes from './routes/projects.js';
import tagsRoutes from './routes/tags.js';
import foldersRoutes from './routes/folders.js';
import reviewRoutes from './routes/review.js';
import searchRoutes from './routes/search.js';
import statsRoutes from './routes/stats.js';

const app = express();
const PORT = process.env.PORT || 3334;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175', 'http://127.0.0.1:5176', 'http://4.241.178.65:5173', 'http://4.241.178.65:3334', 'http://gtd.nebulame.com', 'http://gtd.nebulame.com:5173'],
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inbox', inboxRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`GTD Pro API server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
