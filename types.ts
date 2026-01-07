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

export type DesignTheme = 'modern' | 'elegant' | 'tech' | 'minimal';

export type VisualStyle = 'photorealistic' | 'minimal-vector' | 'hand-drawn' | 'isometric-3d' | 'abstract-geometric';

export interface PresentationStyle {
  theme: DesignTheme;
  primaryColor: string;
  fontScale: number; // 0.8 to 1.2
  visualStyle: VisualStyle;
}

export interface Presentation {
  title: string;
  slides: Slide[];
  style: PresentationStyle;
}

export type GenerationStage = 'IDLE' | 'ANALYZING_DOC' | 'GENERATING_STRUCTURE' | 'GENERATING_IMAGES' | 'COMPLETE' | 'ERROR';

export interface GenerationStatus {
  stage: GenerationStage;
  message: string;
  progress: number; // 0 to 100
  currentSlideIndex?: number;
  totalSlides?: number;
}
