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
  Maximize2,
  Layout,
  Type,
  Palette,
  Monitor,
  Plus,
  Settings2,
  Image as ImageIcon
} from 'lucide-react';
import { Slide, Presentation, GenerationStatus, DesignTheme, PresentationStyle } from './types';
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
  // --- State ---
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<GenerationStatus>(INITIAL_STATUS);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'content'>('design');

  const slideContainerRef = useRef<HTMLDivElement>(null);

  // --- Actions ---

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
      
      // Initialize presentation with style
      const initialPresentation: Presentation = {
        title: structure.title,
        slides: structure.slides,
        style: {
          theme: (structure.theme as DesignTheme) || 'modern',
          primaryColor: '', // Will default in renderer
          fontScale: 1
        }
      };
      
      setPresentation(initialPresentation);
      setStatus({ stage: 'GENERATING_IMAGES', message: 'Visualizing Slide 1...', progress: 40, totalSlides: structure.slides.length, currentSlideIndex: 0 });

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
             setPresentation(prev => prev ? ({ ...prev, slides: [...updatedSlides] }) : null);
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

  const updateSlide = (updatedSlide: Slide) => {
    if (!presentation) return;
    const newSlides = [...presentation.slides];
    newSlides[currentSlideIndex] = updatedSlide;
    setPresentation({ ...presentation, slides: newSlides });
  };

  const handleRegenerateImage = async (slideId: string, prompt: string) => {
    if (!presentation) return;
    
    // Find index
    const index = presentation.slides.findIndex(s => s.id === slideId);
    if (index === -1) return;

    // Set loading state for that image locally (optional optimization, for now just use main status or silent update)
    // We will silently update for better UX, or maybe a toast?
    // Let's just update the image to null to show loading state in renderer
    const slidesCopy = [...presentation.slides];
    slidesCopy[index] = { ...slidesCopy[index], imageUrl: '' };
    setPresentation({ ...presentation, slides: slidesCopy });

    try {
       const newImage = await generateSlideImage(prompt);
       const finalSlides = [...presentation.slides];
       finalSlides[index] = { ...finalSlides[index], imageUrl: newImage };
       setPresentation({ ...presentation, slides: finalSlides });
    } catch (e) {
       console.error("Failed to regen", e);
    }
  };

  const handleExport = () => {
    if (!presentation) return;
    window.print();
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

  // --- Keyboard & Fullscreen ---
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      slideContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  useEffect(() => {
      const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate if not typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if(e.key === 'ArrowRight') nextSlide();
      if(e.key === 'ArrowLeft') prevSlide();
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  });


  // --- Render Helpers ---

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
                 Slide {status.currentSlideIndex} / {status.totalSlides}
               </p>
            )}
         </div>
       </div>
     );
  };

  // --- Main Render ---

  if (!presentation) {
    // Landing / Setup State
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
         {renderProgress()}
         
         <div className="w-full max-w-2xl text-center space-y-8">
            <div className="flex justify-center mb-6">
               <div className="p-4 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                 <Sparkles className="w-12 h-12 text-blue-500" />
               </div>
            </div>
            
            <h1 className="text-5xl font-serif font-bold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
              DocuFlow AI
            </h1>
            <p className="text-xl text-slate-400 max-w-lg mx-auto">
              Transform PRDs, Docs, and Ideas into investor-ready presentations with intelligent visual storytelling.
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl mt-12 text-left space-y-6">
               
               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-300 ml-1">Upload Source (PDF/Text)</label>
                 <div className="relative group">
                    <input 
                      type="file" 
                      accept=".pdf,.txt,.md"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full p-4 bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl group-hover:border-blue-500/50 group-hover:bg-slate-800/80 transition-all flex items-center justify-center gap-3">
                       <Upload className="w-5 h-5 text-slate-400" />
                       <span className="text-slate-300 font-medium">{file ? file.name : "Choose File"}</span>
                    </div>
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-300 ml-1">Instructions & Context</label>
                 <textarea 
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="e.g. Create a pitch deck for a Series A round. Focus on the AI features."
                   className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder:text-slate-600"
                 />
               </div>

               <button
                  onClick={handleGenerate}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                   <Sparkles className="w-5 h-5" /> Generate Presentation
                </button>
            </div>
         </div>
      </div>
    );
  }

  // Workspace State
  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      {renderProgress()}

      {/* Hidden Print Container */}
      <div id="print-container" className="hidden">
          {presentation.slides.map((slide, idx) => (
            <div key={idx} className="print-slide">
              <SlideRenderer 
                slide={slide} 
                style={presentation.style} 
                onUpdate={() => {}} 
                onRegenerateImage={() => {}}
                readOnly
              />
            </div>
          ))}
      </div>

      {/* Top Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-slate-100 font-semibold font-serif">
              <Sparkles className="w-5 h-5 text-blue-500" />
              DocuFlow
           </div>
           <div className="h-4 w-px bg-slate-700" />
           <input 
              value={presentation.title}
              onChange={(e) => setPresentation({...presentation, title: e.target.value})}
              className="bg-transparent border-none outline-none text-slate-300 text-sm w-64 hover:text-white focus:text-white transition-colors"
           />
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={handleExport}
             className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium border border-slate-700 transition-colors"
           >
              <Download className="w-3.5 h-3.5" /> Export PDF
           </button>
           <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium shadow-md transition-colors">
              <Monitor className="w-3.5 h-3.5" /> Present
           </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
         
         {/* Left Sidebar: Thumbnails */}
         <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
               <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slides</h3>
               <button className="p-1 hover:bg-slate-800 rounded text-slate-500"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
               {presentation.slides.map((slide, idx) => (
                  <div 
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`group relative aspect-video bg-slate-800 rounded-lg border-2 cursor-pointer transition-all ${currentSlideIndex === idx ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700 hover:border-slate-500'}`}
                  >
                     <div className="absolute top-2 left-2 w-5 h-5 bg-black/50 backdrop-blur rounded flex items-center justify-center text-[10px] text-white font-mono">
                        {idx + 1}
                     </div>
                     <div className="w-full h-full flex items-center justify-center text-slate-600 scale-50 origin-center">
                        {/* Mini preview logic could go here, for now simpler placeholder */}
                        <Layout className="w-8 h-8 opacity-20" />
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* Center: Canvas */}
         <div className="flex-1 bg-slate-950 relative flex flex-col">
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
               <div 
                 ref={slideContainerRef}
                 className="aspect-video w-full max-w-5xl shadow-2xl shadow-black rounded-sm overflow-hidden bg-white relative ring-1 ring-slate-800"
               >
                  <SlideRenderer 
                     slide={presentation.slides[currentSlideIndex]} 
                     style={presentation.style}
                     onUpdate={updateSlide}
                     onRegenerateImage={handleRegenerateImage}
                  />
               </div>
            </div>

            {/* Bottom Nav */}
            <div className="h-12 border-t border-slate-800 bg-slate-900 px-4 flex items-center justify-center gap-4">
                <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-30">
                   <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs text-slate-500 font-mono">
                   {currentSlideIndex + 1} / {presentation.slides.length}
                </span>
                <button onClick={nextSlide} disabled={currentSlideIndex === presentation.slides.length - 1} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 disabled:opacity-30">
                   <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={toggleFullscreen} className="absolute right-4 p-2 hover:bg-slate-800 rounded-full text-slate-400">
                   <Maximize2 className="w-4 h-4" />
                </button>
            </div>
         </div>

         {/* Right Sidebar: Properties */}
         <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col">
            <div className="flex border-b border-slate-800">
               <button 
                 onClick={() => setActiveTab('design')}
                 className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 Design
               </button>
               <button 
                 onClick={() => setActiveTab('content')}
                 className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'content' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 Notes
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-8">
               
               {activeTab === 'design' ? (
                  <>
                     {/* Theme Selector */}
                     <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <Palette className="w-3.5 h-3.5" /> Theme
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                           {['modern', 'elegant', 'tech', 'minimal'].map((t) => (
                              <button
                                 key={t}
                                 onClick={() => setPresentation({...presentation, style: {...presentation.style, theme: t as DesignTheme}})}
                                 className={`px-3 py-2 rounded text-xs capitalize text-left border ${presentation.style.theme === t ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'}`}
                              >
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Typography */}
                     <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <Type className="w-3.5 h-3.5" /> Typography Scale
                        </label>
                        <input 
                          type="range" 
                          min="0.8" 
                          max="1.2" 
                          step="0.05"
                          value={presentation.style.fontScale}
                          onChange={(e) => setPresentation({...presentation, style: {...presentation.style, fontScale: parseFloat(e.target.value)}})}
                          className="w-full accent-blue-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                     </div>

                     {/* Colors */}
                     <div className="space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <Settings2 className="w-3.5 h-3.5" /> Accent Color
                        </label>
                        <div className="flex items-center gap-3">
                           <input 
                             type="color" 
                             value={presentation.style.primaryColor || '#2563EB'}
                             onChange={(e) => setPresentation({...presentation, style: {...presentation.style, primaryColor: e.target.value}})}
                             className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                           />
                           <span className="text-xs text-slate-500 font-mono">
                             {presentation.style.primaryColor || 'Default'}
                           </span>
                        </div>
                     </div>

                     {/* Current Slide Info */}
                     <div className="pt-6 border-t border-slate-800 space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                           <ImageIcon className="w-3.5 h-3.5" /> Visual Prompt
                        </label>
                        <textarea
                           value={presentation.slides[currentSlideIndex].visualPrompt || ''}
                           onChange={(e) => {
                              const newSlide = {...presentation.slides[currentSlideIndex], visualPrompt: e.target.value};
                              updateSlide(newSlide);
                           }}
                           className="w-full h-24 bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-300 resize-none focus:outline-none focus:border-blue-500"
                        />
                        <button 
                           onClick={() => {
                              const s = presentation.slides[currentSlideIndex];
                              if(s.visualPrompt) handleRegenerateImage(s.id, s.visualPrompt);
                           }}
                           className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300"
                        >
                           Update Visual
                        </button>
                     </div>
                  </>
               ) : (
                  <div className="space-y-4">
                     <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Speaker Notes</label>
                     <textarea
                        value={presentation.slides[currentSlideIndex].speakerNotes}
                        onChange={(e) => {
                           const newSlide = {...presentation.slides[currentSlideIndex], speakerNotes: e.target.value};
                           updateSlide(newSlide);
                        }}
                        className="w-full h-[calc(100vh-200px)] bg-transparent border-none outline-none text-sm text-slate-300 leading-relaxed resize-none font-sans"
                        placeholder="Add speaker notes here..."
                     />
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
}
