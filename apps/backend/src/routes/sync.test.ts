import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { syncRoutes } from './sync.js';
import * as authUtils from '../utils/authUtils.js';

const mockSupabaseSelect = vi.fn();
const mockSupabaseSingle = vi.fn();
const mockSupabaseEq = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpsert = vi.fn();
const mockSupabaseDelete = vi.fn();
const mockSupabaseUpdate = vi.fn();

vi.mock('../utils/authUtils.js', () => {
  return {
    authenticate: vi.fn(),
    supabaseService: {
      from: vi.fn((table) => {
        const queryChain: any = {};
        queryChain.insert = mockSupabaseInsert;
        queryChain.upsert = mockSupabaseUpsert;
        queryChain.delete = mockSupabaseDelete.mockReturnValue(queryChain);
        queryChain.update = mockSupabaseUpdate.mockReturnValue(queryChain);
        queryChain.select = mockSupabaseSelect.mockReturnValue(queryChain);
        queryChain.eq = mockSupabaseEq.mockReturnValue(queryChain);
        queryChain.single = mockSupabaseSingle;
        return queryChain;
      })
    }
  };
});

describe('Sync Routes', () => {
  let app: any;
  const mockElderId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCaregiverId = 'caregiver_1';

  beforeEach(async () => {
    app = Fastify();
    app.register(syncRoutes);
    await app.ready();
    
    vi.resetAllMocks();

    vi.mocked(authUtils.authenticate).mockResolvedValue({
      user: { id: mockCaregiverId } as any,
      userClient: {} as any
    });
    
    mockSupabaseInsert.mockResolvedValue({ error: null });
    mockSupabaseUpdate.mockResolvedValue({ error: null });
    mockSupabaseUpsert.mockResolvedValue({ error: null });
    mockSupabaseDelete.mockResolvedValue({ error: null });
    
    // Default auth check success for caregiver_elder_links
    mockSupabaseSingle.mockResolvedValue({ data: { id: 'mapping_1' }, error: null });
    mockSupabaseEq.mockReturnValue({ single: mockSupabaseSingle, eq: mockSupabaseEq });
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(authUtils.authenticate).mockRejectedValue(new Error('Unauthorized'));
    const res = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {}
    });
    expect(res.statusCode).toBe(401);
  });

  it('queues unknown event types without materializing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {
        id: '123e4567-e89b-12d3-a456-426614174111',
        type: 'UNKNOWN_EVENT',
        payload: { some: 'data' },
        createdAt: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('QUEUED');
    expect(mockSupabaseUpsert).not.toHaveBeenCalled();
  });

  it('materializes CULTURAL_PROFILE_UPDATED events securely', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'CULTURAL_PROFILE_UPDATED',
        payload: { 
          elderId: mockElderId,
          region: 'Assam',
          preferredLanguage: 'as',
          preferredThemes: ['Food']
        },
        createdAt: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('SYNCED');
    expect(mockSupabaseUpsert).toHaveBeenCalled();
  });

  it('rejects profile update if caregiver is unauthorized', async () => {
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null }); // Unlinked
    
    const res = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {
        id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'REMINDER_CREATED',
        payload: { 
          id: '123e4567-e89b-12d3-a456-426614174002',
          elderId: mockElderId,
          title: 'Drink Water',
          time: '09:00',
          recurrence: 'DAILY'
        },
        createdAt: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(403);
    expect(mockSupabaseUpsert).not.toHaveBeenCalled();
  });

  it('allows elder to update reminder completion but not create/delete', async () => {
    // Mock user is the elder themselves
    vi.mocked(authUtils.authenticate).mockResolvedValue({
      user: { id: mockElderId } as any,
      userClient: {} as any
    });
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null }); // No caregiver link

    // Update completion (Allowed)
    const updateRes = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {
        id: '123e4567-e89b-12d3-a456-426614174999',
        type: 'REMINDER_UPDATED',
        payload: { 
          id: '123e4567-e89b-12d3-a456-426614174888',
          elderId: mockElderId,
          title: 'Drink Water',
          time: '09:00',
          completedToday: true
        },
        createdAt: new Date().toISOString()
      }
    });
    expect(updateRes.statusCode).toBe(200);
    expect(mockSupabaseUpdate).toHaveBeenCalled();

    // Create (Denied)
    const createRes = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {
        id: '123e4567-e89b-12d3-a456-426614174777',
        type: 'REMINDER_CREATED',
        payload: { 
          id: '123e4567-e89b-12d3-a456-426614174888',
          elderId: mockElderId,
          title: 'Drink Water',
          time: '09:00'
        },
        createdAt: new Date().toISOString()
      }
    });
    expect(createRes.statusCode).toBe(403);
  });
  
  it('validates payloads rigorously', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sync',
      payload: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'REMINDER_CREATED',
        payload: { 
          // Missing id, missing elderId
          title: 'Drink Water',
          time: '25:00' // Invalid time
        },
        createdAt: new Date().toISOString()
      }
    });

    expect(res.statusCode).toBe(400); // Zod validation fails
  });
});
