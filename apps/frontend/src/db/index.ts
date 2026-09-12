import Dexie, { type EntityTable } from 'dexie';

interface LocalProfile {
  id: string;
  fullName: string;
  primaryLanguage: string;
  avatarUrl?: string;
  updatedAt: string;
}

interface LocalGame {
  id: string;
  templateId: string;
  isPersonalized: boolean;
  configuration: any;
  createdAt: string;
}

interface LocalSession {
  id: string;
  gameId: string;
  status: 'STARTED' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string;
}

interface LocalMemory {
  id: string;
  title: string;
  description?: string;
  dateOfMemory?: string;
}

interface SyncEvent {
  id: string;
  type: string;
  entity?: string;
  payload: any;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  retryCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
}

export class SmritiSetuDB extends Dexie {
  profiles!: EntityTable<LocalProfile, 'id'>;
  games!: EntityTable<LocalGame, 'id'>;
  sessions!: EntityTable<LocalSession, 'id'>;
  memories!: EntityTable<LocalMemory, 'id'>;
  syncEvents!: EntityTable<SyncEvent, 'id'>;

  constructor() {
    super('SmritiSetuDB');
    this.version(2).stores({
      profiles: 'id, fullName',
      games: 'id, templateId',
      sessions: 'id, gameId, status',
      memories: 'id, title',
      syncEvents: 'id, type, status, createdAt',
    });
  }
}

export const db = new SmritiSetuDB();
