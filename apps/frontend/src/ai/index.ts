export interface GameContext {
  elderId: string;
  recentPerformance: any; // define later
  memories: any[]; // define later
}

export interface GameContent {
  questions: any[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AIProvider {
  generateGameContent(context: GameContext): Promise<GameContent>;
  // analyzeCognitivePerformance...
  // personalizeReminder...
}

export class LocalFallbackProvider implements AIProvider {
  async generateGameContent(context: GameContext): Promise<GameContent> {
    console.log('Using LocalFallbackProvider. Generating content entirely locally...', context);
    return {
      questions: [
        {
          id: 'q1',
          text: 'What is your name?',
          options: ['Option A', 'Option B'], // Would be derived from profile/memories locally
          correctAnswer: 'Option A'
        }
      ],
      difficulty: 'easy'
    };
  }
}

// These would implement AIProvider and interact with external APIs
export class GeminiProvider implements AIProvider {
  apiKey?: string;
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async generateGameContent(context: GameContext): Promise<GameContent> {
    if (!this.apiKey) throw new Error('API key required for Gemini');
    // Call Gemini API...
    return { questions: [], difficulty: 'medium' };
  }
}

export class GroqProvider implements AIProvider {
  apiKey?: string;
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async generateGameContent(context: GameContext): Promise<GameContent> {
    if (!this.apiKey) throw new Error('API key required for Groq');
    // Call Groq API...
    return { questions: [], difficulty: 'easy' };
  }
}

// AI Factory / Resolver
export class AIManager {
  private activeProvider: AIProvider;
  private fallbackProvider: AIProvider;

  constructor() {
    this.fallbackProvider = new LocalFallbackProvider();
    
    // Logic to select provider based on env or settings
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      this.activeProvider = new GeminiProvider(geminiKey);
    } else {
      this.activeProvider = this.fallbackProvider;
    }
  }

  async generateGameContent(context: GameContext): Promise<GameContent> {
    try {
      return await this.activeProvider.generateGameContent(context);
    } catch (error) {
      console.warn('Primary AI failed, falling back to local provider', error);
      return await this.fallbackProvider.generateGameContent(context);
    }
  }
}

export const aiManager = new AIManager();
