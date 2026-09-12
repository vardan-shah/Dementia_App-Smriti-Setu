import Dexie, { type EntityTable } from 'dexie';
import type { CognitiveBaseline, PerformanceRecord } from '../services/personalization/types';

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
  elderId: string; // Added to scope sessions to specific elders
  status: 'STARTED' | 'COMPLETED' | 'ABANDONED';
  startedAt: string;
  completedAt?: string;
  metrics?: any;
}

export interface LocalRelative {
  id: string;
  elderId: string;
  name: string;
  relationship: string;
  photoLocal?: string; // base64 or blob for offline
  photoUrl?: string;   // resolved Supabase URL
  voiceLocal?: string;
  voiceUrl?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface LocalMemory {
  id: string;
  elderId: string;
  relativeId?: string;
  title: string;
  storyText?: string;
  photoLocal?: string;
  photoUrl?: string;
  voiceLocal?: string;
  voiceUrl?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
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
  cognitiveBaselines!: EntityTable<CognitiveBaseline, 'id'>;
  performanceRecords!: EntityTable<PerformanceRecord, 'id'>;
  changeSignals!: EntityTable<import('../services/radar/types').ChangeSignal, 'id'>;

  constructor() {
    super('SmritiSetuDB');
    
    // v3 Schema (Legacy)
    this.version(3).stores({
      profiles: 'id, fullName',
      games: 'id, templateId',
      sessions: 'id, gameId, status',
      memories: 'id, elderId, title',
      relatives: 'id, elderId, name',
      syncEvents: 'id, type, status, createdAt',
    });

    // v4 Schema: Retain 'memories', update its schema indices, and migrate data in-place
    this.version(4).stores({
      profiles: 'id, fullName',
      games: 'id, templateId',
      sessions: 'id, gameId, status',
      memories: 'id, elderId, relativeId', // Updated index
      relatives: 'id, elderId, name',
      syncEvents: 'id, type, status, createdAt',
    }).upgrade(async tx => {
      // Migrate old memories in-place
      await tx.table('memories').toCollection().modify(m => {
        if (m.description && !m.storyText) {
          m.storyText = m.description;
          delete m.description;
        }
        m.syncStatus = 'SYNCED';
      });
    });

    // v5 Schema: Add elderId to sessions indexing
    this.version(5).stores({
      sessions: 'id, [gameId+elderId], gameId, elderId, status', // Re-indexed to include elderId and compound key
    });

    // v6 Schema: Add cognitiveBaselines
    this.version(6).stores({
      cognitiveBaselines: 'id, [elderId+category], elderId',
    });

    // v7 Schema: Add performanceRecords
    this.version(7).stores({
      performanceRecords: 'id, elderId, sessionId, gameId, status',
    });

    // v8 Schema: Add changeSignals
    this.version(8).stores({
      changeSignals: 'id, elderId, category, status, severity, lastObservedAt',
    });
  }
}

export const db = new SmritiSetuDB();
