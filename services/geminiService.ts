import { GoogleGenAI, Type } from "@google/genai";
import { Slide, SlideLayout } from "../types";

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
    You are an expert Information Designer and Product Lead. 
    Your goal is to transform provided documents (PRDs, Guides, Pitches) into a professional presentation.
    
    CRITICAL INSTRUCTIONS:
    1. FAITHFULNESS: Tell the story EXACTLY as it is in the source.
    2. CLEAN TEXT: Do NOT use markdown symbols (like **, ##) in the JSON output strings. Return clean, plain text.
    3. UI MOCKUPS: If the content describes a software interface, screen, or dashboard, explicitly request a UI Mockup in the 'visualPrompt'.
       - Example visualPrompt: "High-fidelity UI mockup of a user analytics dashboard, dark mode, clean figma style"
    4. LAYOUTS:
       - Use 'PROCESS' for flows.
       - Use 'DATA' for metrics.
       - Use 'CONTENT_LEFT'/'RIGHT' for general content with visuals.
    
    Structure the output as JSON.
  `;

  const userPrompt = `
    Here is the source material. 
    ${userNotes ? `User Notes: ${userNotes}` : ''}
    
    Please generate the JSON structure for the presentation.
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
      thinkingConfig: { thinkingBudget: 2048 }, 
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

export const generateSlideImage = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  const modelId = "gemini-2.5-flash-image"; 

  const isUiRequest = prompt.toLowerCase().includes("ui") || 
                      prompt.toLowerCase().includes("screen") || 
                      prompt.toLowerCase().includes("mockup") || 
                      prompt.toLowerCase().includes("dashboard") ||
                      prompt.toLowerCase().includes("interface");

  let styleInstruction = "Modern, clean, professional vector art style.";
  
  if (isUiRequest) {
    styleInstruction = "High-fidelity UI Design, Figma Style, clean user interface, modern SaaS aesthetic, detailed, pixel perfect.";
  } else if (prompt.toLowerCase().includes("chart") || prompt.toLowerCase().includes("graph")) {
    styleInstruction = "Data visualization, 3D infographic style, clean geometry, isometric.";
  } else if (prompt.toLowerCase().includes("wireframe")) {
    styleInstruction = "Blueprint style, white lines on blue background, technical schematic.";
  }

  const enhancedPrompt = `
    Generate an image.
    Subject: ${prompt}
    Style: ${styleInstruction}
    Context: Professional Business Presentation.
    Constraint: NO TEXT, NO ALPHABET, NO WORDS in the image (unless it is a UI mockup where greeking/lorem ipsum is acceptable).
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
