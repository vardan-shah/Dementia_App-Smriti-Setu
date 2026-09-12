import { FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
// Service role client - DO NOT USE for standard user operations.
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function authenticate(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseService.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  // Create a user-scoped client that respects RLS securely
  const userClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY || 'dummy', {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  
  return { user, userClient };
}
