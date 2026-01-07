import React from 'react';
import { Slide, SlideLayout } from '../types';
import { Quote, BarChart3, List, Layout, ArrowRight } from 'lucide-react';

interface SlideRendererProps {
  slide: Slide;
  className?: string;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({ slide, className = '' }) => {
  
  // Base slide container
  const baseClasses = `w-full h-full bg-white text-slate-900 p-12 overflow-hidden flex flex-col relative shadow-2xl ${className}`;
  
  // Background Decoration (abstract shapes)
  const BackgroundDeco = () => (
    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-100 rounded-bl-full -z-0 opacity-50" />
  );

  const ImageContainer = ({ src, alt }: { src?: string, alt: string }) => {
    if (!src) return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 rounded-lg border border-slate-200 border-dashed">
        <div className="text-center">
          <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <span className="text-xs uppercase tracking-widest opacity-70">Visualizing...</span>
        </div>
      </div>
    );
    return (
      <img 
        src={`data:image/png;base64,${src}`} 
        alt={alt} 
        className="w-full h-full object-cover rounded-lg shadow-md"
      />
    );
  };

  // Render content based on layout
  const renderContent = () => {
    switch (slide.layout) {
      case SlideLayout.TITLE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center z-10">
             <div className="absolute inset-0 z-0 opacity-10">
                {slide.imageUrl && <img src={`data:image/png;base64,${slide.imageUrl}`} className="w-full h-full object-cover" />}
             </div>
            <div className="z-10 max-w-4xl">
              <h1 className="text-6xl font-serif font-bold text-slate-900 mb-6">{slide.title}</h1>
              {slide.subtitle && <h2 className="text-2xl text-slate-600 font-light">{slide.subtitle}</h2>}
              <div className="mt-12 w-24 h-1 bg-blue-600 mx-auto"></div>
            </div>
          </div>
        );

      case SlideLayout.CONTENT_LEFT:
        return (
          <div className="flex flex-row h-full gap-12 z-10">
            <div className="w-1/2 flex flex-col justify-center">
              <h2 className="text-4xl font-serif font-bold mb-8 text-slate-800">{slide.title}</h2>
              <ul className="space-y-4">
                {slide.content.map((point, i) => (
                  <li key={i} className="flex items-start text-lg text-slate-600">
                    <span className="mr-3 mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="w-1/2 flex items-center justify-center p-4">
              <ImageContainer src={slide.imageUrl} alt={slide.title} />
            </div>
          </div>
        );

      case SlideLayout.CONTENT_RIGHT:
        return (
          <div className="flex flex-row h-full gap-12 z-10">
            <div className="w-1/2 flex items-center justify-center p-4">
              <ImageContainer src={slide.imageUrl} alt={slide.title} />
            </div>
            <div className="w-1/2 flex flex-col justify-center">
              <h2 className="text-4xl font-serif font-bold mb-8 text-slate-800">{slide.title}</h2>
              <ul className="space-y-4">
                {slide.content.map((point, i) => (
                  <li key={i} className="flex items-start text-lg text-slate-600">
                    <span className="mr-3 mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case SlideLayout.QUOTE:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center z-10 px-24">
            <Quote className="w-16 h-16 text-blue-200 mb-8" />
            <blockquote className="text-4xl font-serif italic text-slate-800 leading-relaxed mb-8">
              "{slide.content[0]}"
            </blockquote>
            {slide.subtitle && <cite className="text-xl text-slate-500 not-italic">- {slide.subtitle}</cite>}
          </div>
        );

      case SlideLayout.DATA:
        return (
          <div className="flex flex-col h-full z-10">
            <h2 className="text-3xl font-serif font-bold mb-8 text-slate-800">{slide.title}</h2>
            <div className="flex-1 flex flex-row gap-8">
              <div className="w-1/3 space-y-6">
                 {slide.content.map((point, i) => (
                  <div key={i} className="bg-slate-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-slate-700">{point}</p>
                  </div>
                ))}
              </div>
              <div className="w-2/3 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 p-4 overflow-hidden">
                 <ImageContainer src={slide.imageUrl} alt="Data visualization" />
              </div>
            </div>
          </div>
        );

      case SlideLayout.PROCESS:
        return (
          <div className="flex flex-col h-full z-10">
             <div className="flex justify-between items-end mb-8 border-b border-slate-100 pb-4">
               <h2 className="text-3xl font-serif font-bold text-slate-800">{slide.title}</h2>
               {slide.subtitle && <span className="text-slate-500">{slide.subtitle}</span>}
             </div>
             
             {/* Process Visual at top if available */}
             {slide.imageUrl && (
                <div className="h-48 w-full mb-8 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                   <img src={`data:image/png;base64,${slide.imageUrl}`} className="w-full h-full object-cover" alt="Process flow" />
                </div>
             )}

             <div className="flex-1 grid grid-cols-3 gap-6">
                {slide.content.map((step, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-6 relative group hover:bg-white hover:shadow-lg transition-all border border-slate-100">
                     <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
                       {i + 1}
                     </div>
                     <p className="text-slate-700 mt-2 text-lg">{step}</p>
                     {i < slide.content.length - 1 && (
                        <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10 text-slate-300">
                           <ArrowRight className="w-6 h-6" />
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
            <h2 className="text-4xl font-serif font-bold mb-12 text-slate-800 border-b pb-4">{slide.title}</h2>
            <div className="grid grid-cols-2 gap-8">
               {slide.content.map((point, i) => (
                  <div key={i} className="flex items-start p-6 bg-slate-50 rounded-lg">
                    <div className="bg-blue-100 p-2 rounded-full mr-4 text-blue-600">
                       <List className="w-6 h-6" />
                    </div>
                    <p className="text-xl text-slate-700">{point}</p>
                  </div>
                ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className={baseClasses}>
      <BackgroundDeco />
      {renderContent()}
      
      {/* Footer */}
      <div className="absolute bottom-6 left-12 right-12 flex justify-between items-end text-xs text-slate-400 border-t border-slate-100 pt-4">
        <span>CONFIDENTIAL</span>
        <span>DocuFlow AI Generated</span>
      </div>
    </div>
  );
};

export default SlideRenderer;
