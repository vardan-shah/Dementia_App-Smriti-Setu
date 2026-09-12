import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildApp } from '../app.js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => {
  const mSupabase = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    order: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    }
  };
  return { createClient: vi.fn(() => mSupabase) };
});

import { createClient } from '@supabase/supabase-js';
const mSupabase = createClient('', '') as any;

describe('Relatives API', () => {
  let app: any;

  beforeEach(async () => {
    app = await buildApp();
    vi.clearAllMocks();
  });

  it('POST /v1/relatives should create a relative', async () => {
    // Mock the relative insert returning successfully (simulating RLS pass)
    mSupabase.single.mockResolvedValueOnce({
      data: { id: 'rel-1', name: 'Meena', relationship: 'daughter' },
      error: null
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/relatives',
      headers: {
        authorization: 'Bearer fake-token'
      },
      payload: {
        elderId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Meena',
        relationship: 'daughter'
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Meena');
  });

  it('GET /v1/relatives should return relatives', async () => {
    // Mock relatives query
    mSupabase.order.mockResolvedValueOnce({
      data: [{ id: 'rel-1', name: 'Meena', relationship: 'daughter' }],
      error: null
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/relatives?elderId=123e4567-e89b-12d3-a456-426614174000',
      headers: {
        authorization: 'Bearer fake-token'
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.length).toBe(1);
    expect(body[0].name).toBe('Meena');
  });

  it('POST /v1/relatives should deny access if unlinked (RLS error)', async () => {
    // Mock the RLS rejection
    mSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'Row Level Security' }
    });

    const response = await app.inject({
      method: 'POST',
      url: '/v1/relatives',
      headers: {
        authorization: 'Bearer fake-token'
      },
      payload: {
        elderId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Intruder',
        relationship: 'other'
      }
    });

    expect(response.statusCode).toBe(403);
  });
});
