import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function Register() {
  const navigate = useNavigate();
  const { setRole } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Use SECURITY DEFINER RPC to atomically provision public.users + caregiver_profiles.
      // Idempotent (ON CONFLICT DO NOTHING), runs server-side — not blocked by RLS.
      const { error: profileError } = await supabase.rpc('ensure_caregiver_profile', {
        p_full_name: fullName || 'Caregiver',
      });

      if (profileError) {
        console.error('[Register] Profile provisioning failed:', profileError);
        // The on_auth_user_created trigger already created public.users.
        // The profile will be repaired on next login automatically.
      }

      setRole('CAREGIVER');
      navigate('/caregiver');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-surface p-6">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Caregiver Registration</h1>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input 
              type="text" 
              required
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-primary"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="mt-4">
            {loading ? 'Registering...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link to="/caregiver/login" className="text-secondary hover:underline">Log in</Link>
        </div>
      </Card>
    </div>
  );
}
