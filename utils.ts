import { Slide, SlideLayout, SlideElement } from './types';

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const downloadAsJson = (data: object, filename: string) => {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = filename;
  link.click();
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Converts the abstract AI layout into movable elements for the canvas
export const hydrateLayoutToElements = (slide: Slide): SlideElement[] => {
  const elements: SlideElement[] = [];
  const id = () => generateId();

  // Helper to add text
  const addText = (text: string, x: number, y: number, w: number, size: number, weight: string = 'normal', align: 'left'|'center'|'right' = 'left') => {
    if (!text) return;
    elements.push({
      id: id(),
      type: 'text',
      content: text,
      x, y, width: w, height: 'auto' as any,
      style: { fontSize: size, fontWeight: weight, textAlign: align, zIndex: 10 }
    });
  };

  // Helper to add image
  const addImage = (x: number, y: number, w: number, h: number) => {
    // We store the prompt in content temporarily if image not generated yet, or use the base64
    const imgContent = slide.imageUrl ? `data:image/png;base64,${slide.imageUrl}` : '';
    elements.push({
      id: id(),
      type: 'image',
      content: imgContent,
      x, y, width: w, height: h,
      style: { zIndex: 1 }
    });
  };

  switch (slide.layout) {
    case SlideLayout.TITLE:
      addText(slide.title, 10, 30, 80, 4, 'bold', 'center');
      addText(slide.subtitle || '', 20, 50, 60, 1.5, 'normal', 'center');
      if (slide.imageUrl) addImage(0, 0, 100, 100); // Background image
      break;

    case SlideLayout.CONTENT_LEFT:
      addText(slide.title, 5, 10, 40, 2.5, 'bold', 'left');
      slide.content.forEach((point, i) => {
        addText(`• ${point}`, 5, 30 + (i * 10), 40, 1.2, 'normal', 'left');
      });
      addImage(50, 10, 45, 80);
      break;

    case SlideLayout.CONTENT_RIGHT:
      addImage(5, 10, 45, 80);
      addText(slide.title, 55, 10, 40, 2.5, 'bold', 'left');
      slide.content.forEach((point, i) => {
        addText(`• ${point}`, 55, 30 + (i * 10), 40, 1.2, 'normal', 'left');
      });
      break;

    case SlideLayout.BULLETS:
      addText(slide.title, 10, 10, 80, 3, 'bold', 'left');
      slide.content.forEach((point, i) => {
        // Two columns logic
        const col = i % 2 === 0 ? 10 : 55;
        const row = 30 + (Math.floor(i/2) * 15);
        addText(point, col, row, 40, 1.5, 'normal', 'left');
      });
      break;
      
    case SlideLayout.QUOTE:
       addText('"', 10, 20, 10, 8, 'bold', 'left');
       addText(slide.content[0], 15, 30, 70, 2.5, 'normal', 'center');
       if(slide.subtitle) addText(`— ${slide.subtitle}`, 60, 60, 30, 1.2, 'bold', 'right');
       break;

    case SlideLayout.DATA:
    case SlideLayout.PROCESS:
    default:
       addText(slide.title, 5, 5, 90, 2.5, 'bold', 'left');
       if(slide.imageUrl) addImage(5, 20, 90, 40);
       slide.content.forEach((point, i) => {
         addText(point, 5, 65 + (i * 8), 90, 1.2, 'normal', 'left');
       });
       break;
  }

  return elements;
};
