import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Play, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Download,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Slide, Presentation, GenerationStatus } from './types';
import { generatePresentationStructure, generateSlideImage } from './services/geminiService';
import { fileToBase64 } from './utils';
import SlideRenderer from './components/SlideRenderer';

// Default initial state
const INITIAL_STATUS: GenerationStatus = {
  stage: 'IDLE',
  message: 'Ready to create',
  progress: 0
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<GenerationStatus>(INITIAL_STATUS);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!file && !notes) {
      alert("Please upload a PDF or enter some notes to get started.");
      return;
    }

    try {
      setStatus({ stage: 'ANALYZING_DOC', message: 'Analyzing document structure & intent...', progress: 10 });

      let base64File = null;
      let mimeType = null;

      if (file) {
        base64File = await fileToBase64(file);
        mimeType = file.type;
      }

      setStatus({ stage: 'GENERATING_STRUCTURE', message: 'Planning narrative flow & visuals...', progress: 30 });
      
      const structure = await generatePresentationStructure(base64File, mimeType, notes);
      
      // Initialize presentation with structure (no images yet)
      const initialPresentation: Presentation = {
        title: structure.title,
        slides: structure.slides,
        theme: 'navy'
      };
      
      setPresentation(initialPresentation);
      setStatus({ stage: 'GENERATING_IMAGES', message: 'Visualizing Slide 1...', progress: 40, totalSlides: structure.slides.length, currentSlideIndex: 0 });

      // Sequentially generate images
      const updatedSlides = [...initialPresentation.slides];
      
      for (let i = 0; i < updatedSlides.length; i++) {
        const slide = updatedSlides[i];
        if (slide.visualPrompt) {
          setStatus(prev => ({
            ...prev,
            message: `Visualizing slide ${i + 1} of ${updatedSlides.length}...`,
            progress: 40 + Math.floor(((i + 1) / updatedSlides.length) * 60),
            currentSlideIndex: i + 1
          }));

          try {
             const base64Image = await generateSlideImage(slide.visualPrompt);
             updatedSlides[i] = { ...slide, imageUrl: base64Image };
             // Update state incrementally so user sees progress
             setPresentation({ ...initialPresentation, slides: [...updatedSlides] });
          } catch (err) {
            console.error(`Failed to generate image for slide ${i}`, err);
          }
        }
      }

      setStatus({ stage: 'COMPLETE', message: 'Visuals Ready!', progress: 100 });

    } catch (error: any) {
      console.error(error);
      setStatus({ stage: 'ERROR', message: `Error: ${error.message || 'Unknown error'}`, progress: 0 });
    }
  };

  const nextSlide = () => {
    if (presentation && currentSlideIndex < presentation.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      slideContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen change to update state if user presses ESC
  useEffect(() => {
      const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
      if(e.key === 'ArrowRight') nextSlide();
      if(e.key === 'ArrowLeft') prevSlide();
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Render Helpers
  const renderProgress = () => {
     if (status.stage === 'IDLE' || status.stage === 'COMPLETE' || status.stage === 'ERROR') return null;
     
     return (
       <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center backdrop-blur-sm">
         <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">{status.message}</h3>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mt-4">
              <div 
                className="bg-blue-500 h-full transition-all duration-500 ease-out" 
                style={{ width: `${status.progress}%` }}
              />
            </div>
            {status.totalSlides && (
               <p className="text-slate-400 text-sm mt-2">
                 Processing slide {status.currentSlideIndex} / {status.totalSlides}
               </p>
            )}
         </div>
       </div>
     );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {renderProgress()}

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h1 className="font-serif text-xl font-bold tracking-tight">DocuFlow AI</h1>
        </div>
        <div className="flex items-center gap-4">
            {presentation && (
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <Download className="w-4 h-4" /> Export PDF
                </button>
            )}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Panel: Input */}
        <div className={`
            flex-shrink-0 w-full lg:w-96 bg-slate-900 border-r border-slate-800 p-6 overflow-y-auto transition-all duration-300
            ${presentation ? 'hidden lg:flex flex-col' : 'flex flex-col flex-1 max-w-2xl mx-auto lg:mx-0 lg:max-w-none'}
        `}>
          
          <div className="mb-8">
            <h2 className="text-2xl font-serif font-semibold mb-2">Generate Visuals</h2>
            <p className="text-slate-400 text-sm">Upload PRDs, Guides, Notes, or Pitches. We'll visualize the story exactly as it is.</p>
          </div>

          <div className="space-y-6">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Source Document</label>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 transition-colors hover:border-blue-500/50 group text-center relative">
                <input 
                  type="file" 
                  accept=".pdf,.txt,.md"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <div className="p-3 bg-slate-800 rounded-full mb-3 group-hover:bg-slate-700 transition-colors">
                    {file ? <FileText className="w-6 h-6 text-blue-400" /> : <Upload className="w-6 h-6 text-slate-400" />}
                  </div>
                  <p className="text-sm font-medium text-slate-200">
                    {file ? file.name : "Upload PDF or Text"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Notes Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Goal / Instructions</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. This is a user guide for the login screen. Visualize the steps."
                className="w-full h-32 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder:text-slate-600"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={status.stage !== 'IDLE' && status.stage !== 'COMPLETE' && status.stage !== 'ERROR'}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              {status.stage === 'IDLE' || status.stage === 'COMPLETE' || status.stage === 'ERROR' ? (
                 <>
                   <Sparkles className="w-5 h-5" /> Generate Visuals
                 </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Thinking...
                </>
              )}
            </button>
          </div>
          
          {presentation && (
             <div className="mt-8 pt-8 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Structure</h3>
                <div className="space-y-2">
                   {presentation.slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-3 ${idx === currentSlideIndex ? 'bg-slate-800 text-white border-l-2 border-blue-500' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                      >
                         <span className="text-xs font-mono opacity-50 w-4">{idx + 1}</span>
                         <span className="truncate">{slide.title}</span>
                      </button>
                   ))}
                </div>
             </div>
          )}
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-slate-950 flex flex-col h-full relative">
          {presentation ? (
            <>
              {/* Viewer Container */}
              <div className="flex-1 flex items-center justify-center p-4 lg:p-12 overflow-hidden bg-slate-950/50 relative">
                
                {/* Main Slide Stage */}
                <div 
                  ref={slideContainerRef}
                  className="aspect-video w-full max-w-6xl bg-white shadow-2xl rounded-sm overflow-hidden relative group"
                >
                  <SlideRenderer slide={presentation.slides[currentSlideIndex]} />

                  {/* Hover Controls for Fullscreen */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={toggleFullscreen}
                       className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm"
                     >
                       <Maximize2 className="w-5 h-5" />
                     </button>
                  </div>
                </div>

              </div>

              {/* Navigation Bar */}
              <div className="h-20 border-t border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
                
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 text-sm font-mono">
                    {currentSlideIndex + 1} / {presentation.slides.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                    className="p-3 rounded-full hover:bg-slate-800 disabled:opacity-30 text-white transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={nextSlide}
                    disabled={currentSlideIndex === presentation.slides.length - 1}
                    className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                <div className="w-32 hidden lg:block">
                  {/* Speaker notes teaser? Or just empty spacer */}
                </div>
              </div>

              {/* Speaker Notes Overlay (Optional) */}
               <div className="hidden lg:block absolute bottom-24 right-8 w-80 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-4 shadow-xl">
                 <h4 className="text-xs font-semibold text-blue-400 uppercase mb-2">Context & Notes</h4>
                 <p className="text-sm text-slate-300 leading-relaxed">
                   {presentation.slides[currentSlideIndex].speakerNotes}
                 </p>
               </div>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
               <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                 <Play className="w-10 h-10 ml-1 text-slate-700" />
               </div>
               <p className="text-lg">Your generated visuals will appear here</p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
