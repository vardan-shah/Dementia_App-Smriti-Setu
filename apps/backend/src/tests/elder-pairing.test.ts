import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../app.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mSupabase = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-caregiver-id' } },
        error: null
      })
    }
  };
  return { createClient: vi.fn(() => mSupabase) };
});

import { createClient } from '@supabase/supabase-js';
const mSupabase = createClient('', '') as any;

describe('Elder Pairing API', () => {
  let app: any;

  beforeEach(async () => {
    app = await buildApp();
    vi.clearAllMocks();
  });

  it('POST /elders/:id/pairing should generate a code', async () => {
    // Mock the caregiver_elder_links check
    mSupabase.single.mockResolvedValueOnce({
      data: { caregiver_id: 'test-caregiver-id', elder_id: '123e4567-e89b-12d3-a456-426614174000' },
      error: null
    });
    
    // Mock the pairing code insert
    mSupabase.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { code: '123456', expires_at: new Date().toISOString() },
          error: null
        })
      })
    });

    const response = await app.inject({
      method: 'POST',
      url: '/elders/123e4567-e89b-12d3-a456-426614174000/pairing',
      headers: {
        authorization: 'Bearer fake-token'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.code).toBe('123456');
  });

  it('POST /elder/pair should validate a valid code', async () => {
    // Mock finding the code
    mSupabase.single.mockResolvedValueOnce({
      data: { 
        id: 'code-123',
        elder_id: '123e4567-e89b-12d3-a456-426614174000',
        code: '123456', 
        expires_at: new Date(Date.now() + 10000).toISOString() 
      },
      error: null
    });

    // Mock linking
    mSupabase.insert.mockResolvedValueOnce({ error: null });
    // Mock user upsert
    mSupabase.upsert.mockResolvedValueOnce({ error: null });
    // Mock delete code
    mSupabase.delete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    const response = await app.inject({
      method: 'POST',
      url: '/elder/pair',
      payload: {
        code: '123456',
        deviceUid: '123e4567-e89b-12d3-a456-426614174001'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload).status).toBe('paired');
  });

  it('POST /elder/pair should fail on expired code', async () => {
    mSupabase.single.mockResolvedValueOnce({
      data: { 
        code: '123456', 
        expires_at: new Date(Date.now() - 10000).toISOString() 
      },
      error: null
    });

    const response = await app.inject({
      method: 'POST',
      url: '/elder/pair',
      payload: {
        code: '123456',
        deviceUid: '123e4567-e89b-12d3-a456-426614174001'
      }
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error).toBe('Expired pairing code');
  });
});
