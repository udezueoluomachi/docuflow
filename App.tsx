import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  Upload, FileText, Loader2, ChevronRight, ChevronLeft, Download,
  Sparkles, Maximize2, Layout, Type, Palette, Monitor, Plus, Settings2,
  Image as ImageIcon, CheckCircle2, ArrowRight, Command, Grid, Layers, ShieldCheck,
  RefreshCw, Menu, X, PenTool, Box, Activity, PanelLeftClose, PanelRightClose,
  PanelLeftOpen, PanelRightOpen
} from 'lucide-react';
import { Slide, Presentation, GenerationStatus, DesignTheme, PresentationStyle, SlideLayout, VisualStyle } from './types';
import { generatePresentationStructure, generateSlideImage } from './services/geminiService';
import { fileToBase64 } from './utils';
import SlideRenderer from './components/SlideRenderer';

// Default initial state
const INITIAL_STATUS: GenerationStatus = {
  stage: 'IDLE',
  message: 'Ready to create',
  progress: 0
};

// Memoize Thumbnail to prevent heavy re-renders
const SlideThumbnail = memo(({ slide, style, isActive, onClick, index }: { slide: Slide, style: PresentationStyle, isActive: boolean, onClick: () => void, index: number }) => (
  <div 
    onClick={onClick}
    className={`group relative aspect-video bg-slate-800 rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${isActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700 hover:border-slate-500'}`}
  >
     <div className="absolute inset-0 pointer-events-none">
         <SlideRenderer slide={slide} style={style} onUpdate={() => {}} onRegenerateImage={() => {}} readOnly scale={0.15} />
     </div>
     <div className="absolute top-2 left-2 w-5 h-5 bg-black/50 backdrop-blur rounded flex items-center justify-center text-[10px] text-white font-mono z-10 shadow-sm">
        {index + 1}
     </div>
  </div>
));

export default function App() {
  // --- State ---
  const [hasStarted, setHasStarted] = useState(false); 
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<GenerationStatus>(INITIAL_STATUS);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'content'>('design');
  
  // Responsive State
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const slideContainerRef = useRef<HTMLDivElement>(null);

  // --- Mobile check ---
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowLeftSidebar(false);
        setShowRightSidebar(false);
      } else {
        setShowLeftSidebar(true);
        setShowRightSidebar(true);
      }
    };
    handleResize(); // Init
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Actions ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStart = () => {
    setHasStarted(true);
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

      setStatus({ stage: 'GENERATING_STRUCTURE', message: 'Architecting narrative flow...', progress: 30 });
      
      const structure = await generatePresentationStructure(base64File, mimeType, notes);
      
      const initialPresentation: Presentation = {
        title: structure.title,
        slides: structure.slides,
        style: {
          theme: (structure.theme as DesignTheme) || 'modern',
          primaryColor: '',
          fontScale: 1,
          visualStyle: 'isometric-3d'
        }
      };
      
      setPresentation(initialPresentation);
      setStatus({ stage: 'GENERATING_IMAGES', message: 'Rendering Slide 1...', progress: 40, totalSlides: structure.slides.length, currentSlideIndex: 0 });

      const updatedSlides = [...initialPresentation.slides];
      
      // Generate visuals
      for (let i = 0; i < updatedSlides.length; i++) {
        const slide = updatedSlides[i];
        if (slide.visualPrompt) {
          setStatus(prev => ({
            ...prev,
            message: `Illustrating slide ${i + 1}...`,
            progress: 40 + Math.floor(((i + 1) / updatedSlides.length) * 60),
            currentSlideIndex: i + 1
          }));

          try {
             // Pass default visual style
             const base64Image = await generateSlideImage(slide.visualPrompt, initialPresentation.style.visualStyle);
             updatedSlides[i] = { ...slide, imageUrl: base64Image };
             setPresentation(prev => prev ? ({ ...prev, slides: [...updatedSlides] }) : null);
          } catch (err) {
            console.error(`Failed to generate image for slide ${i}`, err);
          }
        }
      }

      setStatus({ stage: 'COMPLETE', message: 'Deck Ready', progress: 100 });

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
    const index = presentation.slides.findIndex(s => s.id === slideId);
    if (index === -1) return;

    const slidesCopy = [...presentation.slides];
    slidesCopy[index] = { ...slidesCopy[index], imageUrl: '' }; 
    setPresentation({ ...presentation, slides: slidesCopy });

    try {
       // Use current visual style from presentation state
       const newImage = await generateSlideImage(prompt, presentation.style.visualStyle);
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
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if(e.key === 'ArrowRight') nextSlide();
      if(e.key === 'ArrowLeft') prevSlide();
  };

  useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderProgress = () => {
     if (status.stage === 'IDLE' || status.stage === 'COMPLETE' || status.stage === 'ERROR') return null;
     
     return (
       <div className="fixed inset-0 bg-[#0B0F19]/90 z-50 flex items-center justify-center backdrop-blur-md">
         <div className="w-full max-w-md p-8 bg-[#1E293B] rounded-2xl shadow-2xl border border-white/10 text-center animate-fade-in-up">
            <div className="relative w-16 h-16 mx-auto mb-6">
               <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
               <Loader2 className="relative w-16 h-16 text-blue-500 animate-spin" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2 font-sans-premium">{status.message}</h3>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-6">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full transition-all duration-500 ease-out" 
                style={{ width: `${status.progress}%` }}
              />
            </div>
            {status.totalSlides && (
               <p className="text-slate-400 text-xs mt-4 font-mono">
                 Processing {status.currentSlideIndex} / {status.totalSlides}
               </p>
            )}
         </div>
       </div>
     );
  };

  // --- Landing Page ---
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col relative overflow-hidden">
         {/* Background SVG Pattern */}
         <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

         {/* Nav */}
         <nav className="relative z-10 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2 font-serif text-2xl font-bold tracking-tight">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Sparkles className="w-5 h-5" />
               </div>
               DocuFlow
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
               <a href="#" className="hover:text-white transition-colors">Features</a>
               <a href="#" className="hover:text-white transition-colors">Pricing</a>
               <button onClick={handleStart} className="text-white hover:text-blue-400">Sign In</button>
               <button 
                  onClick={handleStart}
                  className="px-5 py-2.5 bg-white text-black rounded-full hover:bg-slate-200 transition-all font-semibold"
               >
                  Get Started
               </button>
            </div>
            <button onClick={handleStart} className="md:hidden p-2 text-white">
                <Menu className="w-6 h-6" />
            </button>
         </nav>

         {/* Hero */}
         <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 mt-8 pb-20">
            {/* Abstract Blur blobs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative max-w-4xl mx-auto animate-fade-in-up">
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="text-sm font-medium text-blue-100">AI-Powered Storytelling</span>
               </div>
               <h1 className="text-5xl md:text-8xl font-sans-premium font-bold tracking-tight leading-[1.1] mb-8 bg-gradient-to-b from-white via-white to-slate-400 bg-clip-text text-transparent">
                  Presentations,<br/>Illustrated.
               </h1>
               <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                  Transform boring documents into stunning, investor-ready decks in seconds. 
                  Now featuring smart illustration styles from vector art to 3D renders.
               </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button 
                     onClick={handleStart}
                     className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-lg font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
                  >
                     Start Creating Free <ArrowRight className="w-5 h-5" />
                  </button>
                  <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full text-lg font-semibold transition-all backdrop-blur-sm">
                     View Demo
                  </button>
               </div>
            </div>

            {/* Simulated UI Cards */}
            <div className="mt-24 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-4 opacity-80 animate-fade-in-up delay-200">
               {[
                  { icon: Layers, title: "Smart Layouts", desc: "Auto-adapts content to the perfect slide structure." },
                  { icon: ImageIcon, title: "Generative Art", desc: "Choose from 3D, Vector, or Hand-drawn styles." },
                  { icon: ShieldCheck, title: "Enterprise Secure", desc: "SOC2 compliant with private data handling." }
               ].map((feature, i) => (
                  <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-left hover:bg-white/10 transition-colors">
                     <feature.icon className="w-8 h-8 text-blue-400 mb-4" />
                     <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                     <p className="text-slate-400">{feature.desc}</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
    );
  }

  // --- Upload State ---
  if (!presentation) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-6 animate-fade-in-up relative overflow-hidden">
         <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
         
         {renderProgress()}
         
         <div className="relative z-10 w-full max-w-xl text-center space-y-8">
            <h2 className="text-4xl font-sans-premium font-bold">What are we building?</h2>
            
            <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 shadow-2xl text-left space-y-6 backdrop-blur-xl">
               <div className="space-y-3">
                 <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Source Material</label>
                 <div className="relative group">
                    <input 
                      type="file" 
                      accept=".pdf,.txt,.md"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full p-6 bg-slate-900/50 border-2 border-dashed border-slate-700 rounded-xl group-hover:border-blue-500/50 group-hover:bg-slate-900 transition-all flex flex-col items-center justify-center gap-3">
                       <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-500 transition-colors" />
                       <span className="text-slate-300 font-medium">{file ? file.name : "Drop PDF or Text File"}</span>
                    </div>
                 </div>
               </div>

               <div className="space-y-3">
                 <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Context & Goals</label>
                 <textarea 
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                   placeholder="e.g. Series A Pitch Deck for a Fintech startup. Tone should be confident and professional."
                   className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none placeholder:text-slate-600 transition-all"
                 />
               </div>

               <button
                  onClick={handleGenerate}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                   <Sparkles className="w-5 h-5" /> Generate Deck
                </button>
            </div>
         </div>
      </div>
    );
  }

  // --- Workspace State ---
  return (
    <div className="h-screen bg-[#0B0F19] text-slate-100 flex flex-col overflow-hidden animate-fade-in-up">
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
      <header className="h-16 border-b border-white/5 bg-[#0B0F19] flex items-center justify-between px-4 md:px-6 z-40 shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
           {/* Sidebar Toggle (Mobile/Desktop) */}
           <button 
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className="p-2 text-slate-400 hover:bg-white/5 rounded-md transition-colors"
           >
              {showLeftSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
           </button>

           <div className="hidden md:flex items-center gap-2 text-white font-bold font-serif text-xl tracking-tight">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
               </div>
              DocuFlow
           </div>
           
           <div className="h-6 w-px bg-white/10 hidden md:block" />
           
           <div className="flex items-center gap-2 text-slate-400">
             <FileText className="w-4 h-4" />
             <input 
                value={presentation.title}
                onChange={(e) => setPresentation({...presentation, title: e.target.value})}
                className="bg-transparent border-none outline-none text-sm w-32 md:w-64 hover:text-white focus:text-white transition-colors font-medium truncate"
             />
           </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
           <button 
             onClick={handleExport}
             className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg text-sm font-medium border border-white/5 transition-colors"
           >
              <Download className="w-4 h-4" /> Export
           </button>
           <button className="flex items-center gap-2 px-3 py-2 md:px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all">
              <Monitor className="w-4 h-4" /> <span className="hidden md:inline">Present</span>
           </button>
           <button 
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className="md:hidden p-2 text-slate-400 hover:bg-white/5 rounded-md transition-colors ml-2"
           >
              <Settings2 className="w-5 h-5" />
           </button>
           <div className="hidden md:block w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 ml-4 border-2 border-[#0B0F19]"></div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
         
         {/* Left Sidebar: Thumbnails */}
         <div className={`
             absolute md:relative z-30 h-full bg-[#0F172A] border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out
             ${showLeftSidebar ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden opacity-0 md:opacity-100'}
         `}>
            <div className="p-4 border-b border-white/5 flex justify-between items-center w-72">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Slides</h3>
               <button className="p-1 hover:bg-white/5 rounded text-slate-400 transition-colors"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 w-72">
               {presentation.slides.map((slide, idx) => (
                  <SlideThumbnail 
                    key={slide.id} 
                    slide={slide} 
                    style={presentation.style} 
                    isActive={currentSlideIndex === idx}
                    onClick={() => setCurrentSlideIndex(idx)}
                    index={idx}
                  />
               ))}
            </div>
         </div>

         {/* Center: Canvas */}
         <div className="flex-1 bg-[#0B0F19] relative flex flex-col min-w-0">
            <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden bg-grid-pattern">
               <div 
                 ref={slideContainerRef}
                 className="aspect-video w-full max-w-6xl shadow-2xl shadow-black rounded-sm overflow-hidden bg-white relative ring-1 ring-white/10 transition-all"
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
            <div className="h-16 border-t border-white/5 bg-[#0B0F19] px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                   <span className="text-xs font-mono text-slate-500">
                      {currentSlideIndex + 1} / {presentation.slides.length}
                   </span>
                </div>
                
                <div className="flex items-center gap-2">
                   <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="p-2 hover:bg-white/5 rounded-full text-slate-400 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-6 h-6" />
                   </button>
                   <button onClick={nextSlide} disabled={currentSlideIndex === presentation.slides.length - 1} className="p-2 hover:bg-white/5 rounded-full text-slate-400 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-6 h-6" />
                   </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowRightSidebar(!showRightSidebar)}
                        className="hidden md:block p-2 text-slate-400 hover:bg-white/5 rounded-full transition-colors"
                    >
                        {showRightSidebar ? <PanelRightClose className="w-5 h-5"/> : <PanelRightOpen className="w-5 h-5"/>}
                    </button>
                    <button onClick={toggleFullscreen} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-colors">
                        <Maximize2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
         </div>

         {/* Right Sidebar: Properties */}
         <div className={`
             absolute right-0 md:relative z-30 h-full bg-[#0F172A] border-l border-white/5 flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
             ${showRightSidebar ? 'w-80 translate-x-0' : 'w-0 translate-x-full md:w-0 md:translate-x-0 overflow-hidden opacity-0 md:opacity-100'}
         `}>
            <div className="flex border-b border-white/5 w-80">
               <button 
                 onClick={() => setActiveTab('design')}
                 className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'design' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 Design
               </button>
               <button 
                 onClick={() => setActiveTab('content')}
                 className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'content' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 Notes
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 w-80">
               
               {activeTab === 'design' ? (
                  <>
                     {/* Layout Selector */}
                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <Layout className="w-3.5 h-3.5" /> Slide Layout
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                           {[
                              SlideLayout.TITLE, SlideLayout.CONTENT_LEFT, SlideLayout.CONTENT_RIGHT, 
                              SlideLayout.BULLETS, SlideLayout.DATA, SlideLayout.PROCESS, SlideLayout.QUOTE
                           ].map((l) => (
                              <button
                                 key={l}
                                 onClick={() => updateSlide({...presentation.slides[currentSlideIndex], layout: l})}
                                 className={`p-2 rounded text-[10px] font-medium border transition-all ${presentation.slides[currentSlideIndex].layout === l ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                              >
                                 {l.replace('_', ' ')}
                              </button>
                           ))}
                        </div>
                     </div>

                     <hr className="border-white/5" />

                     {/* Theme Selector */}
                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <Palette className="w-3.5 h-3.5" /> Theme
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                           {['modern', 'elegant', 'tech', 'minimal'].map((t) => (
                              <button
                                 key={t}
                                 onClick={() => setPresentation({...presentation, style: {...presentation.style, theme: t as DesignTheme}})}
                                 className={`px-3 py-2 rounded text-xs capitalize text-left border transition-all ${presentation.style.theme === t ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400 hover:border-slate-500'}`}
                              >
                                 {t}
                              </button>
                           ))}
                        </div>
                     </div>
                     
                     {/* Visual Style Selector */}
                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <PenTool className="w-3.5 h-3.5" /> Illustration Style
                        </label>
                        <div className="space-y-2">
                           {[
                              { id: 'isometric-3d', label: '3D Isometric', desc: 'Clean, soft clay style' },
                              { id: 'minimal-vector', label: 'Flat Vector', desc: 'Modern tech aesthetic' },
                              { id: 'hand-drawn', label: 'Hand Drawn', desc: 'Sketchy & artistic' },
                              { id: 'abstract-geometric', label: 'Geometric', desc: 'Bauhaus shapes' },
                              { id: 'photorealistic', label: 'Photorealistic', desc: 'Cinematic render' }
                           ].map((s) => (
                              <button
                                 key={s.id}
                                 onClick={() => setPresentation({...presentation, style: {...presentation.style, visualStyle: s.id as VisualStyle}})}
                                 className={`w-full px-3 py-2 rounded flex items-center justify-between border transition-all ${presentation.style.visualStyle === s.id ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/10 hover:border-slate-500'}`}
                              >
                                 <div className="text-left">
                                    <div className={`text-xs font-semibold ${presentation.style.visualStyle === s.id ? 'text-blue-400' : 'text-slate-300'}`}>{s.label}</div>
                                    <div className="text-[10px] text-slate-500">{s.desc}</div>
                                 </div>
                                 {presentation.style.visualStyle === s.id && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                              </button>
                           ))}
                        </div>
                     </div>

                     {/* Colors */}
                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <Settings2 className="w-3.5 h-3.5" /> Accent Color
                        </label>
                        <div className="flex items-center gap-3">
                           <input 
                             type="color" 
                             value={presentation.style.primaryColor || '#2563EB'}
                             onChange={(e) => setPresentation({...presentation, style: {...presentation.style, primaryColor: e.target.value}})}
                             className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-white/10"
                           />
                           <div className="flex-1 flex flex-col">
                              <span className="text-xs font-mono text-slate-300">
                                {presentation.style.primaryColor || 'Default'}
                              </span>
                              <span className="text-[10px] text-slate-500">Hex Code</span>
                           </div>
                        </div>
                     </div>

                     <hr className="border-white/5" />

                     {/* Visual Prompt */}
                     <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <ImageIcon className="w-3.5 h-3.5" /> Image Prompt
                        </label>
                        <textarea
                           value={presentation.slides[currentSlideIndex].visualPrompt || ''}
                           onChange={(e) => updateSlide({...presentation.slides[currentSlideIndex], visualPrompt: e.target.value})}
                           className="w-full h-24 bg-black/20 border border-white/10 rounded-lg p-3 text-xs text-slate-300 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button 
                           onClick={() => {
                              const s = presentation.slides[currentSlideIndex];
                              if(s.visualPrompt) handleRegenerateImage(s.id, s.visualPrompt);
                           }}
                           className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
                        >
                           <RefreshCw className="w-3 h-3" /> Regenerate Visual
                        </button>
                     </div>
                  </>
               ) : (
                  <div className="space-y-4">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Speaker Notes</label>
                     <textarea
                        value={presentation.slides[currentSlideIndex].speakerNotes}
                        onChange={(e) => updateSlide({...presentation.slides[currentSlideIndex], speakerNotes: e.target.value})}
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