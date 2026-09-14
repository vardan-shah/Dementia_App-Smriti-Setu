import { FastifyInstance } from 'fastify';
import { supabaseService } from '../utils/authUtils.js';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    return { status: 'ok', service: 'smriti-setu-api' };
  });

  app.get('/create-test', async () => {
    const email = `testcaregiver${Date.now()}@caregiver.com`;
    const password = 'Password123!';
    const { data, error } = await supabaseService.auth.admin.createUser({
      email, password, email_confirm: true
    });
    if (error) return { error };
    
    await supabaseService.from('users').upsert({ id: data.user.id, email, role: 'CAREGIVER' });
    await supabaseService.from('caregiver_profiles').upsert({ id: data.user.id, full_name: 'Test Caregiver' });
    
    return { email, password };
  });
}
