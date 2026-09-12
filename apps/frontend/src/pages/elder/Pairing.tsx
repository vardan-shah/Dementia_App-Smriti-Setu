import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuthStore } from '../../store/useAuthStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function Pairing() {
  const navigate = useNavigate();
  const { setRole, setElderId } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const handlePairing = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in anonymously to get a device auth.uid()
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
      if (authError || !authData.user) {
        throw new Error('Could not secure a device session.');
      }

      // 2. Call backend to verify pairing code and link this device
      const response = await fetch(`${API_URL}/elder/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceUid: authData.user.id })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to pair');
      }

      const { elderId } = await response.json();
      
      // 3. Update local state
      setRole('ELDER');
      setElderId(elderId);
      
      navigate('/elder');
    } catch (err: any) {
      setError(err.message);
      // Clean up anonymous session if pairing failed
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f4f3ec] p-6">
      <Card className="w-full max-w-md p-10 text-center shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Enter Code</h1>
        <p className="text-gray-600 mb-8 text-lg">Ask your caregiver for the 6-digit code.</p>
        
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium">{error}</div>}
        
        <form onSubmit={handlePairing} className="flex flex-col gap-6">
          <input 
            type="text" 
            required
            maxLength={6}
            placeholder="123456"
            className="w-full border-2 border-gray-300 rounded-2xl p-4 text-center text-4xl tracking-[0.5em] focus:outline-none focus:border-primary font-mono"
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <Button type="submit" size="xl" disabled={loading} className="w-full mt-4">
            {loading ? 'Connecting...' : 'Connect'}
          </Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => navigate('/role-select')} className="w-full">
            Go Back
          </Button>
        </form>
      </Card>
    </div>
  );
}
