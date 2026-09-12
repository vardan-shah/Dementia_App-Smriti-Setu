import 'dotenv/config';
import { buildApp } from './app.js';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
