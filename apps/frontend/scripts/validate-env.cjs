const fs = require('fs');

if (process.env.NODE_ENV === 'production') {
  const requiredFrontend = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_API_URL'];
  let err = false;
  for (const v of requiredFrontend) {
    if (!process.env[v]) {
      console.error(`Missing required frontend production variable: ${v}`);
      err = true;
    }
  }
  if (err) process.exit(1);
  console.log('Frontend Production Environment Validated.');
}
