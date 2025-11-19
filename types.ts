import { Type } from "@google/genai";

export enum ToolCategory {
  TEXT = 'Text & Reasoning',
  VISUAL = 'Image Generation',
  MULTIMEDIA = 'Audio & Video',
  REALTIME = 'Real-time Live API',
  KNOWLEDGE = 'Grounding (Search/Maps)',
}

export enum ToolId {
  CHAT_BASIC = 'chat_basic',
  CHAT_CODE = 'chat_code',
  IMAGE_GEN = 'image_gen',
  IMAGE_EDIT = 'image_edit',
  TTS = 'text_to_speech',
  VIDEO_VEO = 'video_veo',
  LIVE_AUDIO = 'live_audio',
  SEARCH_GROUNDING = 'search_grounding',
  MAPS_GROUNDING = 'maps_grounding',
}

export interface ToolConfig {
  id: ToolId;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string; // SVG path or emoji
  model: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text?: string;
  image?: string; // Base64
  audio?: string; // Base64
  videoUri?: string; // For Veo
  groundingChunks?: any[];
  isError?: boolean;
}

export interface VeoState {
  status: 'idle' | 'generating' | 'complete' | 'error';
  videoUri?: string;
  progress?: string;
}

// Helper for PCM Audio
export interface PcmAudioBlob {
  data: string;
  mimeType: string;
}
