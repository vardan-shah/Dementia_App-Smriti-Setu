import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { healthRoutes } from './routes/health.js';
import { syncRoutes } from './routes/sync.js';
import { elderRoutes } from './routes/elders.js';
import { relativeRoutes } from './routes/v1/relatives.js';
import { storiesRoutes } from './routes/v1/stories.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: string | boolean) => void) => {
      // Always allow the origin to ensure CORS works behind edge networks/proxies
      cb(null, origin || true);
    },
    credentials: true
  });

  app.register(healthRoutes);
  app.register(syncRoutes);
  app.register(elderRoutes);
  
  // Phase 2 Routes
  app.register(relativeRoutes, { prefix: '/v1' });
  app.register(storiesRoutes, { prefix: '/v1' });

  // Phase 6 Routes
  const { aiRoutes } = await import('./routes/ai.js');
  app.register(aiRoutes, { prefix: '/api' });

  return app;
}
