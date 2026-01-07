export enum SlideLayout {
  TITLE = 'TITLE',
  CONTENT_LEFT = 'CONTENT_LEFT',
  CONTENT_RIGHT = 'CONTENT_RIGHT',
  BULLETS = 'BULLETS',
  QUOTE = 'QUOTE',
  DATA = 'DATA',
  PROCESS = 'PROCESS'
}

export interface Slide {
  id: string;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  content: string[];
  visualPrompt?: string;
  imageUrl?: string;
  speakerNotes: string;
}

export interface Presentation {
  title: string;
  slides: Slide[];
  theme: 'light' | 'dark' | 'navy';
}

export type GenerationStage = 'IDLE' | 'ANALYZING_DOC' | 'GENERATING_STRUCTURE' | 'GENERATING_IMAGES' | 'COMPLETE' | 'ERROR';

export interface GenerationStatus {
  stage: GenerationStage;
  message: string;
  progress: number; // 0 to 100
  currentSlideIndex?: number;
  totalSlides?: number;
}
