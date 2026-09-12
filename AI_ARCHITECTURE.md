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

## Phase 6: Adaptive Intelligence & Optional AI Boundary
- **Contextual Bandit Engine**: A true but lightweight contextual decision algorithm (epsilon-greedy contextual bandit) operating locally and deterministically. No 'fake ML'.
- **AI Boundary Rules**: External AI (Groq/Gemini) is strictly optional, default OFF, and requires caregiver explicit opt-in. It is used solely for natural language summarization on the backend (/api/ai/summarize), without leaking API keys or PHI to the frontend.
- **Deterministic Fallbacks**: If external AI fails or is disabled, the system transparently utilizes robust local heuristics.

## Phase 6.1 Constraints
- **No Clinical Interpretation**: The summarization provided by Groq/Gemini strictly offers encouraging engagement feedback, never diagnosis.
- **Enforced Boundary**: The `aiEnabled` boolean is strictly evaluated on the Fastify backend; external API calls are physically impossible if opt-in is absent, regardless of configured secrets.
- **Stochastic Behavior**: While the underlying heuristics and deterministic boundaries are fixed, the epsilon-greedy context bandit inherently produces stochastic exploration behaviors over time.
