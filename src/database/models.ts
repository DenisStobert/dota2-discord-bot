import { getDb, saveDatabase } from './db';
import { randomUUID } from 'crypto';

export interface Lobby {
  id: string;
  lobby_id: string | null;
  pass_key: string | null;
  password: string;
  region: number;
  game_mode: number;
  created_at: number;
  closed_at: number | null;
  status: 'active' | 'closed' | 'error';
  owner_id: string;
  channel_id: string;
}

export class LobbyModel {
  static create(data: Omit<Lobby, 'id' | 'created_at' | 'closed_at' | 'status'>): Lobby {
    const db = getDb();
    const id = randomUUID();
    const created_at = Date.now();
    
    db.run(
      `INSERT INTO lobbies (id, lobby_id, pass_key, password, region, game_mode, created_at, status, owner_id, channel_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, data.lobby_id, data.pass_key, data.password, data.region, data.game_mode, created_at, data.owner_id, data.channel_id]
    );

    saveDatabase();

    return {
      id,
      ...data,
      created_at,
      closed_at: null,
      status: 'active',
    };
  }

  static findById(id: string): Lobby | null {
    const db = getDb();
    const result = db.exec('SELECT * FROM lobbies WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) return null;
    return LobbyModel.rowToObject(result[0].columns, result[0].values[0]);
  }

  static findActiveByOwnerId(ownerId: string): Lobby | null {
    const db = getDb();
    const result = db.exec(
      'SELECT * FROM lobbies WHERE owner_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
      [ownerId]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return LobbyModel.rowToObject(result[0].columns, result[0].values[0]);
  }

  static findActiveByChannelId(channelId: string): Lobby | null {
    const db = getDb();
    const result = db.exec(
      'SELECT * FROM lobbies WHERE channel_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
      [channelId]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return LobbyModel.rowToObject(result[0].columns, result[0].values[0]);
  }

  static updateStatus(id: string, status: 'active' | 'closed' | 'error') {
    const db = getDb();
    const closed_at = status === 'closed' ? Date.now() : null;
    db.run('UPDATE lobbies SET status = ?, closed_at = ? WHERE id = ?', [status, closed_at, id]);
    saveDatabase();
  }

  static updateMatchId(id: string, matchId: string) {
    const db = getDb();
    db.run('UPDATE lobbies SET lobby_id = ? WHERE id = ?', [matchId, id]);
    saveDatabase();
  }

  static getAll(): Lobby[] {
    const db = getDb();
    const result = db.exec('SELECT * FROM lobbies ORDER BY created_at DESC');
    if (result.length === 0) return [];
    return result[0].values.map(row => LobbyModel.rowToObject(result[0].columns, row));
  }

  private static rowToObject(columns: string[], values: any[]): Lobby {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = values[i];
    });
    return obj as Lobby;
  }
}