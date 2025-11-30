export enum AppMode {
  LIVE = 'LIVE',
  CHAT = 'CHAT',
  VISION = 'VISION', // Covers Images and Video Analysis
  CREATE = 'CREATE', // Creation Studio (Images, Videos, Code)
  SETTINGS = 'SETTINGS'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
  video?: string;
}

export interface VisionState {
  isAnalyzing: boolean;
  result: string | null;
  mediaData: string | null;
  mediaType: 'image' | 'video' | null;
}

// Window interface for AI Studio Auth
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}