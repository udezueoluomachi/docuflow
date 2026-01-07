import React, { useState, useRef, useEffect } from 'react';
import { Slide, SlideElement, PresentationStyle } from '../types';
import { RefreshCw, GripHorizontal, Trash2, Maximize2, Move } from 'lucide-react';

interface SlideRendererProps {
  slide: Slide;
  style: PresentationStyle;
  onUpdate: (updatedSlide: Slide) => void;
  onRegenerateImage: (slideId: string, prompt: string) => void;
  className?: string;
  readOnly?: boolean;
  scale?: number;
  selectedElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
}

const SlideRenderer: React.FC<SlideRendererProps> = ({ 
  slide, 
  style, 
  onUpdate, 
  onRegenerateImage,
  className = '',
  readOnly = false,
  scale = 1,
  selectedElementId,
  onSelectElement
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementStart, setElementStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Theme Styling
  const getThemeStyles = () => {
    switch (style.theme) {
      case 'elegant':
        return { bg: 'bg-[#F9F8F6]', text: 'text-[#1C1917]', accent: style.primaryColor || '#CA8A04', font: 'font-serif' };
      case 'tech':
        return { bg: 'bg-[#0F172A]', text: 'text-white', accent: style.primaryColor || '#38BDF8', font: 'font-sans-premium' };
      case 'minimal':
        return { bg: 'bg-white', text: 'text-black', accent: style.primaryColor || '#171717', font: 'font-inter' };
      default:
        return { bg: 'bg-white', text: 'text-[#0F172A]', accent: style.primaryColor || '#2563EB', font: 'font-sans-premium' };
    }
  };
  const theme = getThemeStyles();

  // --- Interaction Handlers ---

  const handleElementMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    if (readOnly) return;
    e.stopPropagation();
    onSelectElement?.(el.id);
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: el.x, y: el.y, w: el.width, h: el.height });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, el: SlideElement) => {
    if (readOnly) return;
    e.stopPropagation();
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementStart({ x: el.x, y: el.y, w: el.width, h: el.height });
  };

  // Global Mouse Move / Up handling for dragging
  useEffect(() => {
    if (readOnly) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isResizing) return;
      if (!selectedElementId) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      // Adjust delta by scale to ensure consistent movement regardless of zoom level
      const deltaX = (e.clientX - dragStart.x) / scale;
      const deltaY = (e.clientY - dragStart.y) / scale;

      const deltaXPercent = (deltaX / (containerRect.width / scale)) * 100;
      const deltaYPercent = (deltaY / (containerRect.height / scale)) * 100;

      const newElements = slide.elements.map(el => {
        if (el.id !== selectedElementId) return el;

        if (isDragging) {
           return {
             ...el,
             x: elementStart.x + deltaXPercent,
             y: elementStart.y + deltaYPercent
           };
        } else if (isResizing) {
           return {
             ...el,
             width: Math.max(5, elementStart.w + deltaXPercent),
             height: typeof el.height === 'number' ? Math.max(5, elementStart.h + deltaYPercent) : el.height
           };
        }
        return el;
      });

      onUpdate({ ...slide, elements: newElements });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, elementStart, selectedElementId, slide, scale, onUpdate, readOnly]);


  // --- Rendering ---

  const renderElement = (el: SlideElement) => {
    const isSelected = selectedElementId === el.id;
    
    // Base Styles
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}%`,
      top: `${el.y}%`,
      width: `${el.width}%`,
      height: typeof el.height === 'number' ? `${el.height}%` : 'auto',
      zIndex: el.style?.zIndex || 1,
      cursor: readOnly ? 'default' : isDragging ? 'grabbing' : 'grab',
    };

    return (
      <div 
        key={el.id}
        style={baseStyle}
        onMouseDown={(e) => handleElementMouseDown(e, el)}
        className={`group transition-shadow ${isSelected && !readOnly ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-transparent' : 'hover:ring-1 hover:ring-blue-300 hover:ring-dashed'}`}
      >
        {/* Content Type Rendering */}
        {el.type === 'text' && (
          <textarea
            value={el.content}
            readOnly={readOnly}
            onChange={(e) => {
              const newElements = slide.elements.map(item => item.id === el.id ? {...item, content: e.target.value} : item);
              onUpdate({...slide, elements: newElements});
            }}
            className={`w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-2 ${theme.text} ${theme.font}`}
            style={{
               fontSize: `${(el.style?.fontSize || 2) * style.fontScale}vw`, 
               fontWeight: el.style?.fontWeight || 'normal',
               textAlign: el.style?.textAlign || 'left',
               lineHeight: 1.2
            }}
          />
        )}

        {el.type === 'image' && (
          <div className="w-full h-full relative overflow-hidden rounded-md bg-slate-100">
             {el.content ? (
               <img src={el.content} alt="slide visual" className="w-full h-full object-cover pointer-events-none select-none" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-slate-200/50">
                  <span className="text-xs font-bold text-slate-400">Generating...</span>
               </div>
             )}
             {isSelected && !readOnly && slide.visualPrompt && (
                <button 
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onRegenerateImage(slide.id, slide.visualPrompt || '')}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white text-black z-20"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
             )}
          </div>
        )}

        {el.type === 'shape' && (
          <div 
            className="w-full h-full rounded-md"
            style={{ backgroundColor: el.style?.backgroundColor || theme.accent }}
          />
        )}

        {/* Edit Controls (Only when selected) */}
        {isSelected && !readOnly && (
          <>
            {/* Resize Handle */}
            <div 
              onMouseDown={(e) => handleResizeMouseDown(e, el)}
              className="absolute -bottom-1 -right-1 w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-20 shadow-sm"
            />
            {/* Delete Handle */}
            <div className="absolute -top-3 -right-3 flex gap-1">
               <button 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const newElements = slide.elements.filter(item => item.id !== el.id);
                  onUpdate({...slide, elements: newElements});
                  onSelectElement?.(null);
                }}
                className="p-1 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600"
               >
                 <Trash2 className="w-3 h-3" />
               </button>
            </div>
          </>
        )}
      </div>
    );
  };

  // --- Main Render ---

  // Scale container style
  const contentStyle: React.CSSProperties = scale !== 1 ? {
    width: `${100 / scale}%`,
    height: `${100 / scale}%`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
    position: 'absolute',
    inset: 0
  } : {};

  return (
    <div 
      className={`relative overflow-hidden w-full h-full select-none ${theme.bg} ${className}`}
      onClick={() => !readOnly && onSelectElement?.(null)} // Deselect on click BG
    >
      <div style={contentStyle} ref={containerRef}>
         {/* Background Decor */}
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
              style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${theme.accent} 1px, transparent 0)`, backgroundSize: '40px 40px' }} 
         />

         {/* Elements */}
         {(slide.elements || []).map(renderElement)}
      </div>
    </div>
  );
};

export default SlideRenderer;
