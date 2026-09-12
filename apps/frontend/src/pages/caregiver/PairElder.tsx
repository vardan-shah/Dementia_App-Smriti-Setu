import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function PairElder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const generateCode = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const response = await fetch(`${API_URL}/elders/${id}/pairing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionData.session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate code');
      }

      const data = await response.json();
      setCode(data.code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Pair Elder Device</h1>
      
      <Card className="p-8 text-center">
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        
        {!code ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-600 mb-4">Generate a 6-digit code to enter on the elder's device.</p>
            <Button onClick={generateCode} disabled={loading} className="w-full">
              {loading ? 'Generating...' : 'Generate Pairing Code'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/caregiver')} className="w-full">
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <p className="text-gray-600">Enter this code on the elder's device:</p>
            <div className="text-5xl font-mono tracking-widest font-bold text-primary bg-gray-100 p-6 rounded-xl w-full">
              {code}
            </div>
            <p className="text-sm text-gray-500">This code expires in 24 hours.</p>
            <Button variant="outline" onClick={() => navigate('/caregiver')} className="w-full">
              Done
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
