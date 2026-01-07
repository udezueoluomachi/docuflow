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
): Promise<{ slides: Slide[]; title: string }> => {
  const ai = getAiClient();
  // Using gemini-3-pro-preview for advanced reasoning and "Thinking" capabilities
  const modelId = "gemini-3-pro-preview";

  const systemPrompt = `
    You are an expert Information Designer and Visual Storyteller. 
    Your goal is to transform any provided document (Product Requirements, User Guides, Project Specs, or Pitch Decks) into a clear, visual presentation.
    
    CRITICAL INSTRUCTIONS:
    1. FAITHFULNESS: Tell the story EXACTLY as it is in the source. 
       - If the doc explains a user flow, create slides that show that flow step-by-step.
       - If it's a PRD, structure slides around features and capabilities.
       - If it's a Pitch, structure around value and solution.
       - Do not simply summarize; visualize the "How" and "What".
    
    2. THINKING & INNOVATION: 
       - Analyze the document type first.
       - Break down complex technical concepts into digestible visual slides.
       - Use the 'PROCESS' layout for timelines, user journeys, or step-by-step instructions.
    
    3. VISUALS:
       - For 'visualPrompt', describe the SPECIFIC visual needed to explain the slide.
       - If a user screen/interface is described, prompt for a "minimalist abstract wireframe of a [specific screen] interface".
       - If a process is described, prompt for a "clean flowchart or process diagram showing [steps]".
       - Keep visual prompts descriptive but abstract enough for an AI image generator (avoid specific text rendering requests).
    
    4. SPEAKER NOTES: Provide detailed explanation notes, as if you are teaching the audience the content of the slide.
    
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
      // Enable thinking to allow the model to plan the narrative structure effectively
      thinkingConfig: { thinkingBudget: 2048 }, 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the entire presentation" },
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
                visualPrompt: { type: Type.STRING, description: "A detailed prompt for generating the slide's background or visual aid." },
                speakerNotes: { type: Type.STRING }
              },
              required: ["id", "layout", "title", "content", "visualPrompt", "speakerNotes"]
            }
          }
        },
        required: ["title", "slides"]
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

  // Dynamic style instruction based on keywords in the prompt
  let styleInstruction = "Modern, clean, professional vector art style.";
  if (prompt.toLowerCase().includes("wireframe") || prompt.toLowerCase().includes("interface")) {
    styleInstruction = "High-fidelity minimalist UI wireframe, blueprint style, abstract tech aesthetic.";
  } else if (prompt.toLowerCase().includes("chart") || prompt.toLowerCase().includes("graph")) {
    styleInstruction = "Data visualization, 3D infographic style, clean geometry.";
  }

  const enhancedPrompt = `
    Generate an image.
    Subject: ${prompt}
    Style: ${styleInstruction}
    Color palette: Slate, Blue, White, accents of Gold.
    NO TEXT, NO LETTERS, NO WORDS in the image.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.warn("No content generated for image");
      return "";
    }

    for (const part of parts) {
      if (part.inlineData) {
        return part.inlineData.data; // Base64 string
      }
    }
    
    const textPart = parts.find(p => p.text);
    if (textPart) {
      console.warn("Model returned text instead of image:", textPart.text);
    }

    return "";
  } catch (error) {
    console.error("Image generation failed", error);
    return ""; 
  }
};
