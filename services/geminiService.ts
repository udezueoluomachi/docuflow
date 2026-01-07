import { GoogleGenAI, Type } from "@google/genai";
import { Slide, SlideLayout, VisualStyle } from "../types";

// Helper to get client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY not found in environment variables");
  return new GoogleGenAI({ apiKey });
};

export const generatePresentationStructure = async (
  fileBase64: string | null,
  fileMimeType: string | null,
  userNotes: string
): Promise<{ slides: Slide[]; title: string; theme: string }> => {
  const ai = getAiClient();
  const modelId = "gemini-3-pro-preview";

  const systemPrompt = `
    You are the Chief Design Officer at a prestigious design firm.
    Your objective is to create a "Series B" level investor pitch deck or product presentation.
    
    CORE PRINCIPLES:
    1. **Narrative Flow**: The deck must tell a compelling story, not just list facts.
    2. **Visual Brevity**: Slides should have less text, more impact.
    3. **Professional Layouts**: Choose layouts that best visualize the specific content.
    
    LAYOUT STRATEGY:
    - 'PROCESS': Use for *any* steps, timeline, roadmap, or "how it works".
    - 'DATA': Use for *any* metrics, TAM/SAM/SOM, or traction stats.
    - 'QUOTE': Use for testimonials or vision statements.
    - 'CONTENT_LEFT/RIGHT': Use for feature deep-dives with visuals.
    
    VISUAL PROMPTS (CRITICAL):
    - Write highly specific, artistic prompts for the image generator.
    - If UI/App: "High-fidelity, clean interface design of [feature], floating glass cards, dark mode, Figma aesthetic."
    - If Abstract: "Abstract 3D geometric shapes, glassmorphism, subsurface scattering, [color] lighting, cinematic render."
    
    OUTPUT:
    - Return valid JSON.
    - No markdown formatting in strings.
    - Theme suggestion must be one of: 'modern', 'elegant', 'tech', 'minimal'.
  `;

  const userPrompt = `
    Input Data:
    ${userNotes ? `User Notes: ${userNotes}` : ''}
    
    Generate the presentation JSON.
  `;

  const parts: any[] = [{ text: userPrompt }];
  
  if (fileBase64 && fileMimeType) {
    parts.unshift({
      inlineData: {
        data: fileBase64,
        mimeType: fileMimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: modelId,
    contents: {
      role: 'user',
      parts: parts
    },
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingBudget: 4096 }, 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          theme: { type: Type.STRING, enum: ['modern', 'elegant', 'tech', 'minimal'] },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                layout: { 
                  type: Type.STRING, 
                  enum: [
                    SlideLayout.TITLE, 
                    SlideLayout.CONTENT_LEFT, 
                    SlideLayout.CONTENT_RIGHT, 
                    SlideLayout.BULLETS,
                    SlideLayout.QUOTE,
                    SlideLayout.DATA,
                    SlideLayout.PROCESS
                  ] 
                },
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } },
                visualPrompt: { type: Type.STRING },
                speakerNotes: { type: Type.STRING }
              },
              required: ["id", "layout", "title", "content", "visualPrompt", "speakerNotes"]
            }
          }
        },
        required: ["title", "slides", "theme"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    throw new Error("AI returned invalid JSON structure");
  }
};

export const generateSlideImage = async (prompt: string, style: VisualStyle = 'isometric-3d'): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash-image"; 

  const lcPrompt = prompt.toLowerCase();
  const isUiRequest = lcPrompt.includes("ui") || lcPrompt.includes("screen") || lcPrompt.includes("dashboard") || lcPrompt.includes("interface") || lcPrompt.includes("app");
  
  let aestheticInstruction = "";

  // Override style if it's a specific UI request, otherwise use selected style
  if (isUiRequest) {
    aestheticInstruction = "High-fidelity UI Mockup, isometric perspective, floating 3D glass cards, soft diffuse shadows, modern SaaS aesthetic, minimal text (greeking), highly detailed, Unsplash quality.";
  } else {
    switch (style) {
      case 'minimal-vector':
        aestheticInstruction = "Flat vector illustration, Corporate Memphis style, clean lines, solid colors, minimal detail, white background, SVG style aesthetics.";
        break;
      case 'hand-drawn':
        aestheticInstruction = "Architectural sketch style, pencil and watercolor, loose lines, white background, artistic, rough concept art.";
        break;
      case 'abstract-geometric':
        aestheticInstruction = "Bauhaus inspired geometric abstraction, clean shapes, primary colors, minimalist composition, poster design.";
        break;
      case 'isometric-3d':
        aestheticInstruction = "3D Isometric render, claymorphism, soft lighting, pastel colors, cute and clean, Blender 3D style.";
        break;
      case 'photorealistic':
      default:
        aestheticInstruction = "Cinematic photo-realism, depth of field, studio lighting, 8k resolution, premium texture.";
        break;
    }
  }

  const enhancedPrompt = `
    Generate a presentation visual.
    Subject: ${prompt}
    Style/Art Direction: ${aestheticInstruction}
    
    Strict Constraints: 
    - NO TEXT, NO WORDS, NO ALPHABET (simulated lines for text only). 
    - Professional business context.
    - High quality, no artifacts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: [{ text: enhancedPrompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return "";

    for (const part of parts) {
      if (part.inlineData) return part.inlineData.data;
    }
    return "";
  } catch (error) {
    console.error("Image generation failed", error);
    return ""; 
  }
};
