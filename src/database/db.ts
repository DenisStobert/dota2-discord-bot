import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { config } from '../config';
import { logger } from '../utils/logger';

let db: SqlJsDatabase;

// Create tables
export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new
  if (existsSync(config.database.path)) {
    const buffer = readFileSync(config.database.path);
    db = new SQL.Database(buffer);
    logger.info('Database loaded from file');
  } else {
    db = new SQL.Database();
    logger.info('New database created');
  }

  const createLobbiesTable = `
    CREATE TABLE IF NOT EXISTS lobbies (
      id TEXT PRIMARY KEY,
      lobby_id TEXT,
      pass_key TEXT,
      password TEXT,
      region INTEGER,
      game_mode INTEGER,
      created_at INTEGER,
      closed_at INTEGER,
      status TEXT,
      owner_id TEXT,
      channel_id TEXT
    )
  `;

  db.run(createLobbiesTable);
  saveDatabase();
  logger.info('Database initialized');
}

export function getDb(): SqlJsDatabase {
  return db;
}

export function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(config.database.path, buffer);
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    logger.info('Database connection closed');
  }
}

export { db };