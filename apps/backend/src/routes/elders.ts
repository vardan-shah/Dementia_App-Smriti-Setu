import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

import { authenticate, supabaseService } from '../utils/authUtils.js';

const generatePairingCodeSchema = z.object({
  id: z.string().uuid(),
});

const pairElderSchema = z.object({
  code: z.string().min(6).max(6),
  deviceUid: z.string().uuid()
});

const createElderSchema = z.object({
  full_name: z.string().min(1),
  primary_language: z.string().min(2)
});

const getElderSchema = z.object({
  id: z.string().uuid(),
});

export async function elderRoutes(app: FastifyInstance) {

  // GET /elders
  app.get('/elders', async (request, reply) => {
    try {
      const { user, userClient } = await authenticate(request);
      
      // Use service role to bypass RLS, but enforce business logic
      const { data: links, error: linkError } = await supabaseService
        .from('caregiver_elder_links')
        .select('elder_id')
        .eq('caregiver_id', user.id);
        
      if (linkError) throw linkError;

      const elderIds = links.map(l => l.elder_id);
      if (elderIds.length === 0) {
        return [];
      }

      const { data: elders, error: eldersError } = await supabaseService
        .from('elder_profiles')
        .select('*')
        .in('id', elderIds);

      if (eldersError) throw eldersError;
      return elders;
    } catch (error: any) {
      if (error.message === 'Unauthorized' || error.message.includes('Authorization')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // GET /elders/:id
  app.get('/elders/:id', async (request, reply) => {
    try {
      const { user, userClient } = await authenticate(request);
      const { id: elderId } = getElderSchema.parse(request.params);

      // Verify link: either caregiver linked to elder, or elder device linked to elder
      const { data: caregiverLink } = await supabaseService
        .from('caregiver_elder_links')
        .select('*')
        .eq('caregiver_id', user.id)
        .eq('elder_id', elderId)
        .single();

      const { data: deviceLink } = await supabaseService
        .from('elder_devices')
        .select('*')
        .eq('id', user.id)
        .eq('elder_id', elderId)
        .single();

      if (!caregiverLink && !deviceLink) {
        // Hide existence if not linked
        return reply.status(404).send({ error: 'Elder not found' });
      }

      const { data: elder, error: elderError } = await supabaseService
        .from('elder_profiles')
        .select('*')
        .eq('id', elderId)
        .single();

      if (elderError || !elder) throw elderError;
      return elder;
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      if (error.message === 'Unauthorized' || error.message.includes('Authorization')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /elders
  app.post('/elders', async (request, reply) => {
    try {
      const { user, userClient } = await authenticate(request);
      const { full_name, primary_language } = createElderSchema.parse(request.body);

      // Transaction-like flow using service role to bypass chicken-and-egg RLS issue
      const { data: elderData, error: elderError } = await supabaseService.from('elder_profiles').insert({
        full_name,
        primary_language,
      }).select().single();

      if (elderError) throw elderError;

      const { error: linkError } = await supabaseService.from('caregiver_elder_links').insert({
        caregiver_id: user.id,
        elder_id: elderData.id,
        relationship: 'primary'
      });

      if (linkError) {
        // Rollback on failure
        await supabaseService.from('elder_profiles').delete().eq('id', elderData.id);
        throw linkError;
      }

      return reply.status(201).send(elderData);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      if (error.message === 'Unauthorized' || error.message.includes('Authorization')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /elders/:id/pairing
  app.post('/elders/:id/pairing', async (request, reply) => {
    try {
      const { user, userClient } = await authenticate(request);
      const { id: elderId } = generatePairingCodeSchema.parse(request.params);
      
      // Verify caregiver link
      const { data: link, error: linkError } = await supabaseService
        .from('caregiver_elder_links')
        .select('*')
        .eq('caregiver_id', user.id)
        .eq('elder_id', elderId)
        .single();

      if (linkError || !link) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      const { data, error } = await supabaseService.from('pairing_codes').insert({
        code,
        elder_id: elderId,
        expires_at: expiresAt,
        created_by: user.id
      }).select().single();

      if (error) throw error;
      
      return { code: data.code, expiresAt: data.expires_at };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      if (error.message === 'Unauthorized' || error.message.includes('Authorization')) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /elder/pair
  app.post('/elder/pair', async (request, reply) => {
    try {
      const { code, deviceUid } = pairElderSchema.parse(request.body);
      
      const { data: codeData, error: codeError } = await supabaseService
        .from('pairing_codes')
        .select('*')
        .eq('code', code)
        .single();
        
      if (codeError || !codeData) {
        return reply.status(400).send({ error: 'Invalid pairing code' });
      }

      if (new Date(codeData.expires_at) < new Date()) {
        return reply.status(400).send({ error: 'Expired pairing code' });
      }

      const { error: linkError } = await supabaseService.from('elder_devices').insert({
        id: deviceUid,
        elder_id: codeData.elder_id
      });

      if (linkError) {
        app.log.error(linkError);
        return reply.status(500).send({ error: 'Failed to pair device' });
      }
      
      await supabaseService.from('users').upsert({
        id: deviceUid,
        email: `elder-${deviceUid}@smriti-setu.local`, // Dummy email
        role: 'ELDER'
      });

      await supabaseService.from('pairing_codes').delete().eq('id', codeData.id);

      return { status: 'paired', elderId: codeData.elder_id };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (error as any).errors });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
