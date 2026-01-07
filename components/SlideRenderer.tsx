import React, { useEffect, useRef } from 'react';
import { Slide, SlideLayout, DesignTheme, PresentationStyle } from '../types';
import { Quote, Activity, Layers, Hash, Layout, ArrowRight, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface SlideRendererProps {
  slide: Slide;
  style: PresentationStyle;
  onUpdate: (updatedSlide: Slide) => void;
  onRegenerateImage: (slideId: string, prompt: string) => void;
  className?: string;
  readOnly?: boolean;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({ 
  slide, 
  style, 
  onUpdate, 
  onRegenerateImage,
  className = '',
  readOnly = false
}) => {
  
  // --- Theme Styles ---
  const getThemeStyles = () => {
    switch (style.theme) {
      case 'elegant':
        return {
          fontHead: 'font-serif',
          fontBody: 'font-lato',
          bg: 'bg-[#FDFBF7]',
          textPrimary: 'text-slate-900',
          textSecondary: 'text-slate-600',
          accent: style.primaryColor || '#D97706', // amber-600
          accentText: `text-[${style.primaryColor}]` || 'text-amber-700',
          gradient: 'from-[#FDFBF7] to-[#F5F0E6]',
          cardBg: 'bg-white border-amber-100',
        };
      case 'tech':
        return {
          fontHead: 'font-montserrat',
          fontBody: 'font-opensans',
          bg: 'bg-slate-900',
          textPrimary: 'text-white',
          textSecondary: 'text-slate-400',
          accent: style.primaryColor || '#06B6D4', // cyan-500
          accentText: `text-[${style.primaryColor}]` || 'text-cyan-400',
          gradient: 'from-slate-900 to-slate-800',
          cardBg: 'bg-slate-800 border-slate-700',
        };
      case 'minimal':
        return {
          fontHead: 'font-montserrat',
          fontBody: 'font-opensans',
          bg: 'bg-white',
          textPrimary: 'text-black',
          textSecondary: 'text-gray-500',
          accent: style.primaryColor || '#000000',
          accentText: `text-[${style.primaryColor}]` || 'text-black',
          gradient: 'from-white to-gray-50',
          cardBg: 'bg-white border-gray-200 shadow-sm',
        };
      case 'modern':
      default:
        return {
          fontHead: 'font-montserrat',
          fontBody: 'font-opensans',
          bg: 'bg-white',
          textPrimary: 'text-slate-900',
          textSecondary: 'text-slate-500',
          accent: style.primaryColor || '#2563EB', // blue-600
          accentText: `text-[${style.primaryColor}]` || 'text-blue-600',
          gradient: 'from-white to-slate-50',
          cardBg: 'bg-white border-slate-100 shadow-xl shadow-slate-200/50',
        };
    }
  };

  const s = getThemeStyles();

  // --- Editable Components ---

  const EditableText = ({ 
    value, 
    onChange, 
    className, 
    tagName = 'div' 
  }: { value: string; onChange: (val: string) => void; className?: string; tagName?: 'div' | 'h1' | 'h2' | 'p' | 'span' }) => {
    
    if (readOnly) {
      return React.createElement(tagName, { className, dangerouslySetInnerHTML: { __html: value } });
    }

    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 -ml-1 w-full resize-none overflow-hidden transition-all hover:bg-black/5 ${className}`}
        style={{ height: 'auto' }}
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

  const ImageContainer = ({ src, alt, className }: { src?: string, alt: string, className?: string }) => {
    const handleRegen = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (slide.visualPrompt) {
        onRegenerateImage(slide.id, slide.visualPrompt);
      }
    };

    if (!src) return (
      <div className={`group relative w-full h-full min-h-[300px] flex items-center justify-center rounded-xl border-2 border-dashed opacity-50 ${s.textSecondary} ${style.theme === 'tech' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} ${className}`}>
        <div className="text-center p-8">
          <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <span className="text-xs uppercase tracking-widest opacity-70">Generating Visual...</span>
        </div>
      </div>
    );

    return (
      <div className={`group relative w-full h-full ${className}`}>
        <img 
          src={`data:image/png;base64,${src}`} 
          alt={alt} 
          className="w-full h-full object-cover rounded-xl shadow-lg"
        />
        {!readOnly && (
           <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleRegen}
                className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md text-white text-xs font-medium rounded-full hover:bg-black/90 transition-colors shadow-lg"
              >
                <RefreshCw className="w-3 h-3" /> Regenerate Visual
              </button>
           </div>
        )}
      </div>
    );
  };

  // --- Layout Renders ---

  const renderContent = () => {
    switch (slide.layout) {
      case SlideLayout.TITLE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center z-10 relative">
             {slide.imageUrl && (
                <div className="absolute inset-0 z-0">
                  <img src={`data:image/png;base64,${slide.imageUrl}`} className="w-full h-full object-cover opacity-20 blur-sm scale-110" />
                  <div className={`absolute inset-0 bg-gradient-to-t ${style.theme === 'tech' ? 'from-slate-900 via-slate-900/80' : 'from-white via-white/80'} to-transparent`} />
                </div>
             )}
            
            <div className="z-10 max-w-5xl px-8 w-full flex flex-col items-center">
              <span 
                className={`inline-block py-1 px-3 rounded-full text-xs tracking-widest uppercase mb-6 border ${style.theme === 'tech' ? 'border-cyan-500 text-cyan-400' : 'border-slate-200 text-slate-400'}`}
                style={{ borderColor: style.primaryColor, color: style.primaryColor }}
              >
                Presentation
              </span>
              <EditableText
                tagName="h1"
                value={slide.title}
                onChange={(val) => onUpdate({...slide, title: val})}
                className={`text-7xl font-bold ${s.textPrimary} mb-8 leading-tight tracking-tight text-center ${s.fontHead}`}
              />
              <EditableText
                tagName="h2"
                value={slide.subtitle || ''}
                onChange={(val) => onUpdate({...slide, subtitle: val})}
                className={`text-2xl font-light max-w-3xl mx-auto text-center ${s.textSecondary} ${s.fontBody}`}
              />
              <div 
                className="mt-16 w-32 h-2 mx-auto rounded-full"
                style={{ backgroundColor: style.primaryColor || (style.theme === 'tech' ? '#06B6D4' : '#2563EB') }}
              />
            </div>
          </div>
        );

      case SlideLayout.CONTENT_LEFT:
        return (
          <div className="flex flex-row h-full gap-16 z-10 items-center">
            <div className="w-1/2 flex flex-col justify-center">
              <EditableText
                tagName="h2"
                value={slide.title}
                onChange={(val) => onUpdate({...slide, title: val})}
                className={`text-4xl font-bold mb-8 leading-tight ${s.textPrimary} ${s.fontHead}`}
              />
              <div className="space-y-6">
                {slide.content.map((point, i) => (
                  <div key={i} className={`flex items-start text-xl ${s.textSecondary} ${s.fontBody}`}>
                    <div 
                       className="mt-2 mr-4 w-2 h-2 rounded-full flex-shrink-0" 
                       style={{ backgroundColor: style.primaryColor }}
                    />
                    <EditableText
                      value={point}
                      onChange={(val) => {
                        const newContent = [...slide.content];
                        newContent[i] = val;
                        onUpdate({...slide, content: newContent});
                      }}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="w-1/2 h-[80%] relative group">
               <div 
                  className="absolute -inset-4 rounded-2xl opacity-20 -rotate-2 group-hover:rotate-0 transition-transform duration-500" 
                  style={{ backgroundColor: style.primaryColor }}
               />
               <ImageContainer src={slide.imageUrl} alt={slide.title} className="relative z-10 h-full" />
            </div>
          </div>
        );

      case SlideLayout.CONTENT_RIGHT:
        return (
          <div className="flex flex-row h-full gap-16 z-10 items-center">
            <div className="w-1/2 h-[80%] relative group">
               <div 
                  className="absolute -inset-4 rounded-2xl opacity-20 rotate-2 group-hover:rotate-0 transition-transform duration-500" 
                  style={{ backgroundColor: style.primaryColor }}
               />
               <ImageContainer src={slide.imageUrl} alt={slide.title} className="relative z-10 h-full" />
            </div>
            <div className="w-1/2 flex flex-col justify-center pl-8">
              <EditableText
                tagName="h2"
                value={slide.title}
                onChange={(val) => onUpdate({...slide, title: val})}
                className={`text-4xl font-bold mb-8 leading-tight ${s.textPrimary} ${s.fontHead}`}
              />
              <div className="space-y-6">
                {slide.content.map((point, i) => (
                  <div key={i} className={`flex items-start text-xl ${s.textSecondary} ${s.fontBody}`}>
                    <div 
                       className="mt-2 mr-4 w-2 h-2 rounded-full flex-shrink-0" 
                       style={{ backgroundColor: style.primaryColor }}
                    />
                     <EditableText
                      value={point}
                      onChange={(val) => {
                        const newContent = [...slide.content];
                        newContent[i] = val;
                        onUpdate({...slide, content: newContent});
                      }}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case SlideLayout.QUOTE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center z-10 px-32 relative">
            <div className="absolute top-20 left-20 opacity-10" style={{ color: style.primaryColor }}>
              <Quote className="w-48 h-48" />
            </div>
            <div className="z-10 w-full">
              <div className={`text-5xl mb-12 ${s.textPrimary} ${s.fontHead} ${style.theme === 'elegant' ? 'italic' : 'font-bold'}`}>
                 <EditableText
                    value={`"${slide.content[0]}"`}
                    onChange={(val) => {
                        const clean = val.replace(/^"|"$/g, '');
                        const newContent = [...slide.content];
                        newContent[0] = clean;
                        onUpdate({...slide, content: newContent});
                    }}
                    className="text-center leading-snug w-full"
                  />
              </div>
              
              {slide.subtitle && (
                <div className="flex items-center justify-center gap-4">
                  <div className={`w-12 h-px bg-current opacity-50 ${s.textSecondary}`} />
                   <EditableText
                      value={slide.subtitle}
                      onChange={(val) => onUpdate({...slide, subtitle: val})}
                      className={`text-xl not-italic tracking-wide uppercase text-center ${s.textSecondary} ${s.fontBody}`}
                    />
                  <div className={`w-12 h-px bg-current opacity-50 ${s.textSecondary}`} />
                </div>
              )}
            </div>
          </div>
        );

      case SlideLayout.DATA:
        return (
          <div className="flex flex-col h-full z-10">
            <div className="flex items-center gap-4 mb-12">
               <Activity className="w-8 h-8" style={{ color: style.primaryColor }} />
               <EditableText
                  tagName="h2"
                  value={slide.title}
                  onChange={(val) => onUpdate({...slide, title: val})}
                  className={`text-3xl font-bold ${s.textPrimary} ${s.fontHead}`}
               />
            </div>
            
            <div className="flex-1 flex flex-row gap-12">
              <div className="w-1/3 flex flex-col gap-4">
                 {slide.content.map((point, i) => (
                  <div key={i} className={`p-6 rounded-xl border-l-4 ${s.cardBg} transition-all hover:translate-x-2`} style={{ borderLeftColor: style.primaryColor }}>
                    <div className="flex items-start gap-4">
                      <Hash className="w-5 h-5 mt-1 opacity-50" style={{ color: style.primaryColor }} />
                      <EditableText
                        value={point}
                        onChange={(val) => {
                          const newContent = [...slide.content];
                          newContent[i] = val;
                          onUpdate({...slide, content: newContent});
                        }}
                        className={`text-lg font-medium w-full ${s.textSecondary} ${s.fontBody}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className={`w-2/3 rounded-2xl p-2 ${style.theme === 'tech' ? 'bg-slate-800' : 'bg-slate-100'} overflow-hidden relative`}>
                 <ImageContainer src={slide.imageUrl} alt="Data visualization" className="object-contain" />
              </div>
            </div>
          </div>
        );

      case SlideLayout.PROCESS:
        return (
          <div className="flex flex-col h-full z-10">
             <div className="mb-10 text-center w-full">
               <EditableText
                  tagName="h2"
                  value={slide.title}
                  onChange={(val) => onUpdate({...slide, title: val})}
                  className={`text-3xl font-bold mb-2 text-center ${s.textPrimary} ${s.fontHead}`}
               />
               <EditableText
                  value={slide.subtitle || ''}
                  onChange={(val) => onUpdate({...slide, subtitle: val})}
                  className={`text-center ${s.textSecondary} ${s.fontBody}`}
               />
             </div>
             
             {slide.imageUrl && (
                <div className="h-40 w-full mb-8 rounded-2xl overflow-hidden shadow-sm relative group">
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent z-10" />
                   <ImageContainer src={slide.imageUrl} alt="Process flow" />
                </div>
             )}

             <div className="flex-1 grid grid-cols-3 gap-8 items-start">
                {slide.content.map((step, i) => (
                  <div key={i} className={`relative p-8 rounded-2xl ${s.cardBg} h-full group hover:-translate-y-2 transition-transform duration-300`}>
                     <div 
                        className="absolute -top-4 left-8 w-10 h-10 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-all"
                        style={{ backgroundColor: style.primaryColor }}
                     >
                       {i + 1}
                     </div>
                     
                     <div className="mt-4">
                        <EditableText
                          value={step}
                          onChange={(val) => {
                            const newContent = [...slide.content];
                            newContent[i] = val;
                            onUpdate({...slide, content: newContent});
                          }}
                          className={`text-lg leading-relaxed ${s.textPrimary} ${s.fontBody}`}
                        />
                     </div>

                     {i < slide.content.length - 1 && (
                        <div className={`hidden lg:block absolute -right-6 top-1/2 -translate-y-1/2 z-10 ${s.textSecondary} opacity-30`}>
                           <ArrowRight className="w-8 h-8" />
                        </div>
                     )}
                  </div>
                ))}
             </div>
          </div>
        );

      case SlideLayout.BULLETS:
      default:
        return (
          <div className="flex flex-col h-full z-10">
            <div className={`mb-12 border-b pb-6 ${style.theme === 'tech' ? 'border-slate-700' : 'border-slate-100'}`}>
               <EditableText
                  tagName="h2"
                  value={slide.title}
                  onChange={(val) => onUpdate({...slide, title: val})}
                  className={`text-4xl font-bold ${s.textPrimary} ${s.fontHead}`}
               />
            </div>
            
            <div className="grid grid-cols-2 gap-x-16 gap-y-8">
               {slide.content.map((point, i) => (
                  <div key={i} className="flex items-start group">
                    <div className={`mt-1 mr-6 p-2 rounded-lg ${style.theme === 'tech' ? 'bg-slate-800' : 'bg-slate-50'} group-hover:scale-110 transition-transform`}>
                       <Layers className="w-6 h-6" style={{ color: style.primaryColor }} />
                    </div>
                    <EditableText
                      value={point}
                      onChange={(val) => {
                        const newContent = [...slide.content];
                        newContent[i] = val;
                        onUpdate({...slide, content: newContent});
                      }}
                      className={`text-2xl ${s.textSecondary} ${s.fontBody}`}
                    />
                  </div>
                ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div 
        className={`w-full h-full p-16 overflow-hidden flex flex-col relative bg-gradient-to-br ${s.gradient} ${className}`}
        style={{ fontSize: `${style.fontScale}rem` }}
    >
      
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-white/5 to-white/0 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      {renderContent()}
      
      {/* Footer - No Watermark, just Confidential */}
      <div className={`absolute bottom-8 left-16 right-16 flex justify-between items-end text-xs ${s.textSecondary} opacity-40 border-t ${style.theme === 'tech' ? 'border-slate-800' : 'border-slate-200'} pt-4`}>
        <span className="font-semibold tracking-wider">CONFIDENTIAL</span>
        <span>{new Date().getFullYear()}</span>
      </div>
    </div>
  );
};

export default SlideRenderer;
