import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';

export function Games() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center p-8 max-w-4xl mx-auto w-full">
      <h2 className="text-4xl font-bold mb-8">{t('play_games', 'Play Games')}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <Card 
          className="p-8 cursor-pointer hover:bg-blue-50 transition-colors border-2 hover:border-blue-300"
          onClick={() => navigate('/elder/games/object-recognition')}
        >
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="text-4xl">📸</span>
          </div>
          <h3 className="text-3xl font-bold text-center mb-2">{t('who_is_this', 'Who is this?')}</h3>
          <p className="text-xl text-gray-600 text-center">{t('practice_remembering_family', 'Practice remembering family and friends.')}</p>
        </Card>

        <Card 
          className="p-8 cursor-pointer hover:bg-green-50 transition-colors border-2 hover:border-green-300"
          onClick={() => navigate('/elder/games/recall')}
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="text-4xl">🧠</span>
          </div>
          <h3 className="text-3xl font-bold text-center mb-2">{t('recall_game_title', 'Memory Recall')}</h3>
          <p className="text-xl text-gray-600 text-center">{t('remember_items_shown', 'Remember the items shown.')}</p>
        </Card>

        <Card 
          className="p-8 cursor-pointer hover:bg-purple-50 transition-colors border-2 hover:border-purple-300"
          onClick={() => navigate('/elder/games/language')}
        >
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <span className="text-4xl">📝</span>
          </div>
          <h3 className="text-3xl font-bold text-center mb-2">{t('language_game_title', 'Match the Word')}</h3>
          <p className="text-xl text-gray-600 text-center">{t('match_words_pictures', 'Match words with pictures.')}</p>
        </Card>
      </div>
    </div>
  );
}
