export interface GameMetadata {
  id: string;
  name: string;
  cognitiveCategories: string[];
}

export const GAME_REGISTRY: Record<string, GameMetadata> = {
  'object-recognition': {
    id: 'object-recognition',
    name: 'Familiar Faces',
    cognitiveCategories: ['Memory']
  },
  'recall': {
    id: 'recall',
    name: 'Memory Recall',
    cognitiveCategories: ['Memory']
  },
  'language-exercises': {
    id: 'language-exercises',
    name: 'Match the Word',
    cognitiveCategories: ['Language']
  }
};

export const AVAILABLE_GAMES = Object.values(GAME_REGISTRY);
