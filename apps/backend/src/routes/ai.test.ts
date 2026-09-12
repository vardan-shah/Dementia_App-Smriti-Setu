import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { aiRoutes } from './ai.js';
import * as authUtils from '../utils/authUtils.js';

const mockSupabaseSingle = vi.fn();
const mockSupabaseEq = vi.fn();

vi.mock('../utils/authUtils.js', () => {
  return {
    authenticate: vi.fn(),
    supabaseService: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockSupabaseEq
        }))
      }))
    }
  };
});

describe('AI Routes', () => {
  let app: any;
  const mockElderId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCaregiverId = 'caregiver_1';

  beforeEach(async () => {
    app = Fastify();
    app.register(aiRoutes);
    await app.ready();
    
    vi.resetAllMocks();
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;

    vi.mocked(authUtils.authenticate).mockResolvedValue({
      user: { id: mockCaregiverId } as any,
      userClient: {} as any
    });
    
    // Default auth check success for caregiver_elder_links
    mockSupabaseSingle.mockResolvedValue({ data: { id: 'mapping_1' }, error: null });
    mockSupabaseEq.mockReturnValue({ single: mockSupabaseSingle, eq: mockSupabaseEq });
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(authUtils.authenticate).mockRejectedValue(new Error('Unauthorized'));
    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {}
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthorized caregiver', async () => {
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {
        elderId: mockElderId,
        recentActivities: []
      }
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns deterministic fallback when no API keys are present', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {
        elderId: mockElderId,
        recentActivities: [
          { gameName: 'Recall', accuracy: 0.8, completed: true, difficulty: 'MEDIUM' }
        ]
      }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe('local-fallback');
    expect(res.json().summary).toContain('Recent activity shows');
  });

  it('validates payload boundaries (max 10 items)', async () => {
    const tooMany = Array(11).fill({ gameName: 'A', accuracy: 1, completed: true, difficulty: 'EASY' });
    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {
        elderId: mockElderId,
        recentActivities: tooMany
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('bypasses external provider when aiEnabled is false even if keys exist', async () => {
    process.env.GROQ_API_KEY = 'test_key';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}'));

    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {
        elderId: mockElderId,
        aiEnabled: false,
        recentActivities: []
      }
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe('local-fallback');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('allows external provider when aiEnabled is true', async () => {
    process.env.GROQ_API_KEY = 'test_key';
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: 'AI summary' } }]
    }), { status: 200 }));

    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {
        elderId: mockElderId,
        aiEnabled: true,
        recentActivities: []
      }
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe('groq');
    expect(res.json().summary).toBe('AI summary');
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('falls back to local when external provider fails', async () => {
    process.env.GROQ_API_KEY = 'test_key';
    const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const res = await app.inject({
      method: 'POST',
      url: '/ai/summarize',
      payload: {
        elderId: mockElderId,
        aiEnabled: true,
        recentActivities: []
      }
    });
    
    expect(res.statusCode).toBe(200);
    expect(res.json().provider).toBe('local-fallback');
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
