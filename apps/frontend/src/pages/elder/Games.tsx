import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';

export function Games() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center p-8 max-w-4xl mx-auto w-full">
      <h2 className="text-4xl font-bold mb-8">Play Games</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <Card 
          className="p-8 cursor-pointer hover:bg-blue-50 transition-colors border-2 hover:border-blue-300"
          onClick={() => navigate('/elder/games/object-recognition')}
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="text-4xl">📸</span>
          </div>
          <h3 className="text-3xl font-bold text-center mb-2">Who is this?</h3>
          <p className="text-xl text-gray-600 text-center">Practice remembering family and friends.</p>
        </Card>
      </div>
    </div>
  );
}
