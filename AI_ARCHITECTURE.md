# AI Architecture

## Overview
The AI layer provides personalization, adaptive game generation, and content formatting. However, the system must not be hard-coded to a single provider and must remain functional without any AI API key.

## Abstraction Layer
We define a core interface for AI capabilities:

```typescript
export interface AIProvider {
  generateGameContent(context: GameContext): Promise<GameContent>;
  analyzeCognitivePerformance(data: PerformanceData): Promise<CognitiveAnalysis>;
  personalizeReminder(reminder: Reminder, profile: ElderProfile): Promise<string>;
}
```

## Providers
1. **LocalFallbackProvider**: The default provider. Uses hardcoded templates, simple heuristics, and randomized selections to simulate AI functionality entirely offline. Requires no API keys.
2. **GroqProvider**: Adapter for the Groq API (fast inference).
3. **GeminiProvider**: Adapter for Google's Gemini API (advanced reasoning).

## Resolution Strategy
The application attempts to use the configured provider (e.g., Gemini). If it fails (network error, rate limit, missing key), it immediately falls back to the `LocalFallbackProvider` to ensure the elder's experience is never blocked.
