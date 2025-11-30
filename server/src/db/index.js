import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const dbDir = join(__dirname, '../../db');
const dbPath = join(dbDir, 'gtd.db');

let db = null;
let SQL = null;

// Wrapper to make sql.js API compatible with better-sqlite3 style
class DatabaseWrapper {
  constructor(database) {
    this._db = database;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        self._save();
        return { changes: self._db.getRowsModified() };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this._db.exec(sql);
    this._save();
  }

  pragma(statement) {
    this._db.exec(`PRAGMA ${statement}`);
  }

  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

let dbInstance = null;

// Initialize database
export async function initializeDatabase() {
  if (dbInstance) return dbInstance;

  SQL = await initSqlJs();

  // Ensure db directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  dbInstance = new DatabaseWrapper(db);

  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');

  // Initialize schema
  const schemaPath = join(__dirname, '../../db/schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  dbInstance.exec(schema);

  console.log('Database initialized successfully');

  return dbInstance;
}

// Get database instance (synchronous after initialization)
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

export default { initializeDatabase, getDb };
