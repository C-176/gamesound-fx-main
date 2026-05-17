// src/valorant/api.ts
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const LOCKFILE_PATH = path.join(
  process.env.LOCALAPPDATA || '',
  'Riot Games', 'Riot Client', 'Config', 'lockfile'
);

interface LockfileData {
  port: number;
  password: string;
  protocol: string;
}

function readLockfile(): LockfileData | null {
  try {
    if (!fs.existsSync(LOCKFILE_PATH)) return null;
    const content = fs.readFileSync(LOCKFILE_PATH, 'utf-8').trim();
    // Format: riot:pid:port:password:protocol
    const parts = content.split(':');
    if (parts.length < 5) return null;
    return {
      port: parseInt(parts[2], 10),
      password: parts[3],
      protocol: parts[4],
    };
  } catch {
    return null;
  }
}

function makeRequest(lockfile: LockfileData, endpoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${lockfile.password}`).toString('base64');
    const url = `${lockfile.protocol}://127.0.0.1:${lockfile.port}${endpoint}`;

    const req = https.get(url, {
      headers: { Authorization: `Basic ${auth}` },
      rejectUnauthorized: false,
      timeout: 3000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401) return reject(new Error('Unauthorized'));
        if (res.statusCode === 404) return reject(new Error('Not found'));
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

export interface PresenceData {
  puuid: string;
  product: string;
  private?: string;
  productState?: string;
}

export interface ValorantAPI {
  isAlive(): Promise<boolean>;
  getPresences(): Promise<PresenceData[]>;
  getCurrentGame(): Promise<any>;
  getCoreGameMatch(): Promise<any>;
}

export function createValorantAPI(): ValorantAPI {
  const getLockfile = (): LockfileData => {
    const lf = readLockfile();
    if (!lf) throw new Error('Lockfile not found');
    return lf;
  };

  return {
    async isAlive(): Promise<boolean> {
      const lf = readLockfile();
      if (!lf) return false;
      try {
        await makeRequest(lf, '/chat/v4/presences');
        return true;
      } catch { return false; }
    },

    async getPresences(): Promise<PresenceData[]> {
      const lf = getLockfile();
      const data = await makeRequest(lf, '/chat/v4/presences');
      return data?.presences || [];
    },

    async getCurrentGame(): Promise<any> {
      const lf = getLockfile();
      return makeRequest(lf, '/glz/v1/current-game');
    },

    async getCoreGameMatch(): Promise<any> {
      const lf = getLockfile();
      return makeRequest(lf, '/core-game/v1/matches');
    },
  };
}

export { readLockfile };
