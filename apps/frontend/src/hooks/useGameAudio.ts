import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseGameAudioResult {
  speak: (text: string, lang?: string) => void;
  stop: () => void;
  isPlaying: boolean;
  isAvailable: boolean;
}

export function useGameAudio(): UseGameAudioResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Check if SpeechSynthesis is supported
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsAvailable(true);
    }
    
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (isAvailable && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isAvailable]);

  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!isAvailable || !window.speechSynthesis) return;

    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map our app locales to standard BCP 47 TTS locales
    const localeMap: Record<string, string> = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'as': 'hi-IN' // Fallback Assamese to Hindi voice if Assamese isn't natively supported on most devices
    };

    utterance.lang = localeMap[lang] || lang;
    utterance.rate = 0.9; // slightly slower for elders
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isAvailable, stop]);

  return { speak, stop, isPlaying, isAvailable };
}
