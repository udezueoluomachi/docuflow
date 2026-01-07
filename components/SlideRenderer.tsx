import React from 'react';
import { Slide, SlideLayout, PresentationStyle } from '../types';
import { Quote, Activity, Layers, Hash, Layout, ArrowRight, RefreshCw, Box, Zap } from 'lucide-react';

interface SlideRendererProps {
  slide: Slide;
  style: PresentationStyle;
  onUpdate: (updatedSlide: Slide) => void;
  onRegenerateImage: (slideId: string, prompt: string) => void;
  className?: string;
  readOnly?: boolean;
  scale?: number;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({ 
  slide, 
  style, 
  onUpdate, 
  onRegenerateImage,
  className = '',
  readOnly = false,
  scale = 1
}) => {
  
  // --- Premium Design Tokens ---
  const getThemeStyles = () => {
    switch (style.theme) {
      case 'elegant':
        return {
          fontHead: 'font-serif', // Playfair
          fontBody: 'font-inter', // Inter
          bg: 'bg-[#F9F8F6]', // Warm paper white
          textPrimary: 'text-[#1C1917]', // Warm black
          textSecondary: 'text-[#57534E]', // Stone 600
          accent: style.primaryColor || '#CA8A04', // Muted Gold
          bgDecor: 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent',
          cardBg: 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#E7E5E4]',
          uiBorder: 'border-[#E7E5E4]'
        };
      case 'tech':
        return {
          fontHead: 'font-sans-premium', // DM Sans
          fontBody: 'font-inter',
          bg: 'bg-[#0F172A]', // Slate 900
          textPrimary: 'text-[#F8FAFC]', // Slate 50
          textSecondary: 'text-[#94A3B8]', // Slate 400
          accent: style.primaryColor || '#38BDF8', // Sky 400
          bgDecor: 'bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-sky-900/20 via-[#0F172A] to-[#0F172A]',
          cardBg: 'bg-[#1E293B]/50 backdrop-blur-sm border border-white/5 shadow-2xl',
          uiBorder: 'border-white/10'
        };
      case 'minimal':
        return {
          fontHead: 'font-inter',
          fontBody: 'font-inter',
          bg: 'bg-white',
          textPrimary: 'text-black',
          textSecondary: 'text-[#737373]',
          accent: style.primaryColor || '#171717',
          bgDecor: '',
          cardBg: 'bg-white border border-gray-100 shadow-sm',
          uiBorder: 'border-gray-100'
        };
      case 'modern':
      default:
        return {
          fontHead: 'font-sans-premium',
          fontBody: 'font-inter',
          bg: 'bg-white',
          textPrimary: 'text-[#0F172A]',
          textSecondary: 'text-[#475569]',
          accent: style.primaryColor || '#2563EB',
          bgDecor: 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-white',
          cardBg: 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100',
          uiBorder: 'border-slate-100'
        };
    }
  };

  const s = getThemeStyles();

  // If scaling, apply transform style to container content
  const contentStyle: React.CSSProperties = scale !== 1 ? {
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'absolute',
    inset: 0
  } : {};

  // --- Editable Component Wrappers ---

  const EditableText = ({ 
    value, 
    onChange, 
    className, 
    placeholder,
    tagName = 'div' 
  }: { value: string; onChange: (val: string) => void; className?: string; placeholder?: string; tagName?: 'div' | 'h1' | 'h2' | 'p' | 'span' }) => {
    
    if (readOnly || scale < 1) {
      return React.createElement(tagName, { className, dangerouslySetInnerHTML: { __html: value || placeholder } });
    }

    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-transparent border-none outline-none focus:ring-0 rounded-sm p-0 m-0 w-full resize-none overflow-hidden placeholder:opacity-30 transition-all hover:bg-black/5 focus:bg-transparent ${className}`}
        style={{ height: 'auto', minHeight: '1.2em' }}
        rows={1}
        onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
        }}
        ref={(el) => {
            if(el) {
                 el.style.height = 'auto';
                 el.style.height = el.scrollHeight + 'px';
            }
        }}
      />
    );
  };

  const ImageContainer = ({ src, alt, className, contain = false }: { src?: string, alt: string, className?: string, contain?: boolean }) => {
    const handleRegen = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (slide.visualPrompt) {
        onRegenerateImage(slide.id, slide.visualPrompt);
      }
    };

    if (!src) return (
      <div className={`group relative w-full h-full min-h-[300px] flex flex-col items-center justify-center rounded-sm ${style.theme === 'tech' ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'} border border-dashed ${className}`}>
        <div className="text-center p-8 opacity-40 group-hover:opacity-60 transition-opacity">
          <Layout className="w-10 h-10 mx-auto mb-3" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-sans-premium">Generating Visual</span>
        </div>
      </div>
    );

    return (
      <div className={`group relative w-full h-full overflow-hidden ${className}`}>
        <img 
          src={`data:image/png;base64,${src}`} 
          alt={alt} 
          className={`w-full h-full ${contain ? 'object-contain' : 'object-cover'} transition-transform duration-700 group-hover:scale-105`}
        />
        {!readOnly && scale === 1 && (
           <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
              <button 
                onClick={handleRegen}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md text-slate-900 text-xs font-bold font-inter rounded-full hover:bg-white shadow-lg border border-black/5"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate
              </button>
           </div>
        )}
      </div>
    );
  };

  // --- Layout Implementations ---

  const renderContent = () => {
    switch (slide.layout) {
      case SlideLayout.TITLE:
        return (
          <div className="flex flex-col h-full z-10 relative">
             <div className="flex-1 flex flex-row">
                <div className="w-[45%] flex flex-col justify-center pr-16 pl-16">
                  <div className="mb-8">
                     <span 
                        className={`inline-block py-1.5 px-3 rounded text-[10px] font-bold tracking-[0.2em] uppercase mb-6 ${style.theme === 'tech' ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}
                     >
                       Presentation
                     </span>
                     <EditableText
                        tagName="h1"
                        value={slide.title}
                        onChange={(val) => onUpdate({...slide, title: val})}
                        className={`text-6xl font-bold ${s.textPrimary} mb-6 leading-[1.1] tracking-tight ${s.fontHead}`}
                      />
                     <div className={`w-12 h-1 mb-8`} style={{ backgroundColor: s.accent }} />
                     <EditableText
                        tagName="h2"
                        value={slide.subtitle || ''}
                        onChange={(val) => onUpdate({...slide, subtitle: val})}
                        className={`text-xl font-medium leading-relaxed ${s.textSecondary} ${s.fontBody}`}
                      />
                  </div>
                </div>
                <div className="w-[55%] h-full relative">
                   <div className="absolute inset-0">
                      <ImageContainer src={slide.imageUrl} alt={slide.title} className="h-full w-full" />
                   </div>
                   <div className={`absolute inset-0 bg-gradient-to-r ${style.theme === 'tech' ? 'from-[#0F172A] to-transparent' : 'from-white to-transparent'} opacity-10`} />
                </div>
             </div>
          </div>
        );

      case SlideLayout.CONTENT_LEFT:
        return (
          <div className="flex flex-row h-full z-10">
            <div className="w-1/2 flex flex-col justify-center px-16 py-12">
              <EditableText
                tagName="h2"
                value={slide.title}
                onChange={(val) => onUpdate({...slide, title: val})}
                className={`text-4xl font-bold mb-10 leading-tight ${s.textPrimary} ${s.fontHead}`}
              />
              <div className="space-y-8">
                {slide.content.map((point, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="pt-1.5">
                       <div className={`w-1.5 h-1.5 rounded-full transition-all group-hover:scale-150`} style={{ backgroundColor: s.accent }} />
                    </div>
                    <EditableText
                      value={point}
                      onChange={(val) => {
                        const newContent = [...slide.content];
                        newContent[i] = val;
                        onUpdate({...slide, content: newContent});
                      }}
                      className={`text-xl leading-relaxed font-normal ${s.textSecondary} ${s.fontBody}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-1/2 p-6 flex items-center justify-center">
               <div className={`w-full h-full rounded-lg overflow-hidden relative shadow-2xl ${s.uiBorder}`}>
                  <ImageContainer src={slide.imageUrl} alt={slide.title} />
               </div>
            </div>
          </div>
        );
      
      // ... (Other layouts follow similar pattern, kept concise for update size) ... 
      // Re-implementing specific ones for fullness
      case SlideLayout.CONTENT_RIGHT:
        return (
           <div className="flex flex-row h-full z-10">
            <div className="w-1/2 p-6 flex items-center justify-center">
               <div className={`w-full h-full rounded-lg overflow-hidden relative shadow-2xl ${s.uiBorder}`}>
                  <ImageContainer src={slide.imageUrl} alt={slide.title} />
               </div>
            </div>
            <div className="w-1/2 flex flex-col justify-center px-16 py-12">
              <EditableText
                tagName="h2"
                value={slide.title}
                onChange={(val) => onUpdate({...slide, title: val})}
                className={`text-4xl font-bold mb-10 leading-tight ${s.textPrimary} ${s.fontHead}`}
              />
              <div className="space-y-8">
                {slide.content.map((point, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="pt-1.5">
                       <div className={`w-1.5 h-1.5 rounded-full transition-all group-hover:scale-150`} style={{ backgroundColor: s.accent }} />
                    </div>
                    <EditableText
                      value={point}
                      onChange={(val) => {
                        const newContent = [...slide.content];
                        newContent[i] = val;
                        onUpdate({...slide, content: newContent});
                      }}
                      className={`text-xl leading-relaxed font-normal ${s.textSecondary} ${s.fontBody}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case SlideLayout.PROCESS:
         return (
          <div className="flex flex-col h-full z-10 px-16 py-12">
             <div className="mb-12 w-full flex justify-between items-end border-b pb-6" style={{ borderColor: style.theme === 'tech' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
               <div>
                  <span className={`text-xs font-bold tracking-widest uppercase mb-2 block opacity-50 ${s.textSecondary}`}>Workflow</span>
                  <EditableText
                     tagName="h2"
                     value={slide.title}
                     onChange={(val) => onUpdate({...slide, title: val})}
                     className={`text-4xl font-bold ${s.textPrimary} ${s.fontHead}`}
                  />
               </div>
               <EditableText
                  value={slide.subtitle || ''}
                  onChange={(val) => onUpdate({...slide, subtitle: val})}
                  className={`text-right max-w-md text-sm font-medium opacity-70 ${s.textSecondary} ${s.fontBody}`}
               />
             </div>
             
             {slide.imageUrl && (
                <div className="h-40 w-full mb-8 rounded-xl overflow-hidden shadow-lg relative group border" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
                   <ImageContainer src={slide.imageUrl} alt="Process flow" />
                </div>
             )}

             <div className="flex-1 grid grid-cols-3 gap-6 items-start">
                {slide.content.map((step, i) => (
                  <div key={i} className={`relative p-8 rounded-xl ${s.cardBg} h-full group transition-all duration-300`}>
                     <div className="flex justify-between items-start mb-4">
                        <div 
                           className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm"
                           style={{ backgroundColor: s.accent, color: style.theme === 'tech' ? '#000' : '#fff' }}
                        >
                           {i + 1}
                        </div>
                        {i < slide.content.length - 1 && (
                           <ArrowRight className={`w-5 h-5 opacity-20 ${s.textSecondary}`} />
                        )}
                     </div>
                     <div className="mt-2">
                        <EditableText value={step} onChange={(val) => { const n = [...slide.content]; n[i]=val; onUpdate({...slide, content: n}); }} className={`text-lg font-medium leading-relaxed ${s.textPrimary} ${s.fontBody}`} />
                     </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case SlideLayout.DATA:
        return (
          <div className="flex flex-col h-full z-10 px-16 py-12">
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-black/5">
                     <Activity className="w-6 h-6" style={{ color: s.accent }} />
                  </div>
                  <EditableText tagName="h2" value={slide.title} onChange={(val) => onUpdate({...slide, title: val})} className={`text-3xl font-bold ${s.textPrimary} ${s.fontHead}`} />
               </div>
               <div className={`px-4 py-1 rounded-full text-xs font-mono border ${s.uiBorder} ${s.textSecondary}`}>DATA INSIGHTS</div>
            </div>
            <div className="flex-1 flex flex-row gap-12">
              <div className="w-1/3 flex flex-col justify-center gap-6">
                 {slide.content.map((point, i) => (
                  <div key={i} className={`p-6 rounded-lg ${s.cardBg} transition-all hover:-translate-y-1`}>
                    <div className="flex items-start gap-4">
                      <Hash className="w-5 h-5 mt-1 opacity-40 shrink-0" style={{ color: s.accent }} />
                      <EditableText value={point} onChange={(val) => {const n=[...slide.content];n[i]=val;onUpdate({...slide, content:n});}} className={`text-lg font-medium w-full leading-snug ${s.textPrimary} ${s.fontBody}`} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`w-2/3 h-full rounded-xl p-8 ${style.theme === 'tech' ? 'bg-slate-900/50' : 'bg-gray-50/80'} ${s.uiBorder} border flex items-center justify-center relative overflow-hidden`}>
                 <ImageContainer src={slide.imageUrl} alt="Data visualization" contain={true} className="z-10" />
                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(${s.accent} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
              </div>
            </div>
          </div>
        );

      case SlideLayout.QUOTE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center z-10 px-32 relative">
            <div className="mb-12 opacity-30 scale-150" style={{ color: s.accent }}>
              <Quote className="w-16 h-16" />
            </div>
            <div className="z-10 w-full max-w-4xl">
              <div className={`text-5xl mb-12 ${s.textPrimary} ${s.fontHead} ${style.theme === 'elegant' ? 'italic font-light' : 'font-bold tracking-tight'}`}>
                 <EditableText value={`"${slide.content[0].replace(/^"|"$/g, '')}"`} onChange={(val) => {const c=val.replace(/^"|"$/g,'');const n=[...slide.content];n[0]=c;onUpdate({...slide,content:n});}} className="text-center leading-[1.15] w-full" />
              </div>
              {slide.subtitle && (
                <div className="flex items-center justify-center gap-4">
                  <div className={`w-8 h-px bg-current opacity-30 ${s.textSecondary}`} />
                   <EditableText value={slide.subtitle} onChange={(val) => onUpdate({...slide, subtitle: val})} className={`text-sm font-bold tracking-[0.2em] uppercase text-center ${s.textSecondary} ${s.fontBody}`} />
                  <div className={`w-8 h-px bg-current opacity-30 ${s.textSecondary}`} />
                </div>
              )}
            </div>
          </div>
        );

      default: // BULLETS
        return (
          <div className="flex flex-col h-full z-10 px-16 py-12">
            <div className={`mb-12 border-b pb-6 ${s.uiBorder}`}>
               <EditableText tagName="h2" value={slide.title} onChange={(val) => onUpdate({...slide, title: val})} className={`text-5xl font-bold tracking-tight ${s.textPrimary} ${s.fontHead}`} />
            </div>
            <div className="grid grid-cols-2 gap-x-20 gap-y-10">
               {slide.content.map((point, i) => (
                  <div key={i} className="flex items-start group">
                    <div className={`mt-2 mr-6 p-2 rounded-md ${style.theme === 'tech' ? 'bg-white/5' : 'bg-black/5'}`}>
                       <Box className="w-5 h-5" style={{ color: s.accent }} />
                    </div>
                    <EditableText value={point} onChange={(val) => {const n=[...slide.content];n[i]=val;onUpdate({...slide,content:n});}} className={`text-2xl font-normal leading-normal ${s.textSecondary} ${s.fontBody}`} />
                  </div>
                ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div 
        className={`w-full h-full overflow-hidden flex flex-col relative ${s.bg} ${s.bgDecor} ${className}`}
        style={{ fontSize: `${style.fontScale}rem` }}
    >
      {/* Content wrapper for scaling */}
      <div style={contentStyle}>
          {/* Decorative Noise */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay" 
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
          />
          
          {renderContent()}
          
          {/* Footer */}
          <div className={`absolute bottom-8 left-16 right-16 flex justify-between items-end text-[10px] font-bold tracking-widest uppercase ${s.textSecondary} opacity-30`}>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-current" />
               <span>Confidential</span>
            </div>
            <span>{new Date().getFullYear()} Strategy Deck</span>
          </div>
      </div>
    </div>
  );
};

export default SlideRenderer;