import { describe, it, expect, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { SmritiSetuDB } from '../db';
import { getRecommendedDifficulty } from './adaptiveDifficulty';

describe('Data Migration and Scoping', () => {
  let db: SmritiSetuDB;

  afterEach(async () => {
    if (db) {
      await db.delete();
      db.close();
    }
  });

  it('should migrate v3 database to v4/v5 successfully preserving memory data', async () => {
    const dbName = 'TestMigrationDB';
    await Dexie.delete(dbName);
    
    // Simulate v3
    let v3Db = new Dexie(dbName);
    v3Db.version(3).stores({
      profiles: 'id, fullName',
      games: 'id, templateId',
      sessions: 'id, gameId, status',
      memories: 'id, elderId, title',
      relatives: 'id, elderId, name',
      syncEvents: 'id, type, status, createdAt',
    });
    
    await v3Db.open();
    
    // Insert v3 data
    await v3Db.table('memories').add({
      id: 'mem1',
      elderId: 'elder1',
      title: 'Old Memory',
      description: 'This is an old description'
    });
    
    await v3Db.table('sessions').add({
      id: 'sess1',
      gameId: 'object-recognition',
      status: 'COMPLETED'
    });
    
    v3Db.close();

    // Now open as the real v5 schema
    db = new SmritiSetuDB();
    // Have to trick Dexie to use the same dbname for the test
    (db as any).name = dbName;
    await db.open();
    
    // Verify legacy data is preserved in memories with updated schema
    const stories = await db.memories.toArray();
    expect(stories.length).toBe(1);
    expect(stories[0].id).toBe('mem1');
    expect(stories[0].title).toBe('Old Memory');
    expect(stories[0].storyText).toBe('This is an old description'); // migrated!
    expect(stories[0].syncStatus).toBe('SYNCED');

    // Verify v5 session indexing works
    const sessions = await db.sessions.toArray();
    expect(sessions.length).toBe(1);
  });

  it('elder A sessions do not influence elder B difficulty recommendation', async () => {
    // We can just use a normal open db for this test
    const dbName = 'TestScopingDB';
    await Dexie.delete(dbName);
    db = new SmritiSetuDB();
    (db as any).name = dbName;
    await db.open();

    // Elder A is doing poorly
    await db.sessions.add({
      id: 's1',
      gameId: 'object-recognition',
      elderId: 'elderA',
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      metrics: { correct: 1, errors: 10 }
    } as any);

    // Elder B is doing great
    await db.sessions.add({
      id: 's2',
      gameId: 'object-recognition',
      elderId: 'elderB',
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      metrics: { correct: 10, errors: 0 }
    } as any);

    // Wait, the adaptiveDifficulty directly references the singleton `db` instance from `../db`.
    // In tests, if it imports `db`, we need to mock it or inject it, or just use the singleton and clear it.
    
    // So let's delete the real singleton DB contents for the test
    const realDb = (await import('../db')).db;
    await realDb.sessions.clear();
    
    await realDb.sessions.add({
      id: 's1',
      gameId: 'object-recognition',
      elderId: 'elderA',
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      metrics: { correct: 1, errors: 10 }
    } as any);

    await realDb.sessions.add({
      id: 's2',
      gameId: 'object-recognition',
      elderId: 'elderB',
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      metrics: { correct: 10, errors: 0 }
    } as any);

    const difficultyA = await getRecommendedDifficulty('elderA', 'object-recognition');
    const difficultyB = await getRecommendedDifficulty('elderB', 'object-recognition');

    // elderA has high error rate -> EASY
    expect(difficultyA).toBe('EASY');
    
    // elderB has 0 error rate -> HARD
    expect(difficultyB).toBe('HARD');
  });
});
