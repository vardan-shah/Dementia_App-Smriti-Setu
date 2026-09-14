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
    origin: (origin, cb) => {
      // In production, allow if the origin matches FRONTEND_URL (ignoring trailing slashes)
      // or if it's the exact vercel domain.
      if (!origin) return cb(null, true);
      
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) return cb(null, origin);

      const frontendUrls = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, '')) : [];
      // Always allow the specific vercel app origin as a fallback since it's known
      frontendUrls.push('https://dementia-app-smriti-setu-frontend.vercel.app');
      
      if (frontendUrls.includes(origin)) {
        return cb(null, origin);
      }
      return cb(new Error('Not allowed by CORS'), false);
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
