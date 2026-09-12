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

export interface LocalRelative {
  id: string;
  elderId: string;
  name: string;
  relationship: string;
  photoUrl?: string; // Stored as base64 or blob URL locally if offline, or Supabase URL
  voiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMemory {
  id: string;
  elderId: string;
  title: string;
  description?: string;
  relativeId?: string;
  photoUrl?: string;
  voiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncEvent {
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
  relatives!: EntityTable<LocalRelative, 'id'>;
  syncEvents!: EntityTable<SyncEvent, 'id'>;

  constructor() {
    super('SmritiSetuDB');
    this.version(3).stores({
      profiles: 'id, fullName',
      games: 'id, templateId',
      sessions: 'id, gameId, status',
      memories: 'id, elderId, title',
      relatives: 'id, elderId, name',
      syncEvents: 'id, type, status, createdAt',
    });
  }
}

export const db = new SmritiSetuDB();
