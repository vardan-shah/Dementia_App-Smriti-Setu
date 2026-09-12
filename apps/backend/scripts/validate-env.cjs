const fs = require('fs');

if (process.env.NODE_ENV === 'production') {
  const requiredBackend = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE', 'FRONTEND_URL'];
  let err = false;
  for (const v of requiredBackend) {
    if (!process.env[v]) {
      console.error(`Missing required backend production variable: ${v}`);
      err = true;
    }
  }
  if (err) process.exit(1);
  console.log('Production Environment Validated.');
}
