export enum AppMode {
  CHAT = 'CHAT',
  CODE = 'CODE',
  WRITE = 'WRITE',
  LIVE = 'LIVE',
  IMAGES = 'IMAGES',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO'
}

export enum ChatModelType {
  PRO = 'gemini-3-pro-preview',
  FLASH_SEARCH = 'gemini-3-flash-preview',
  FLASH_LITE = 'gemini-flash-lite-latest',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  images?: string[]; // base64
  videos?: string[]; // base64
  isThinking?: boolean;
  timestamp: number;
  groundingUrls?: Array<{ title: string; uri: string }>;
}

export interface VideoGenerationConfig {
  prompt: string;
  imageBase64?: string;
  aspectRatio: '16:9' | '9:16';
}

export interface ImageGenerationConfig {
  prompt: string;
  aspectRatio: string;
}

export interface ImageEditConfig {
  prompt: string;
  imageBase64: string;
}

// Global declaration for the AI Studio key selection
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}