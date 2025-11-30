import { GoogleGenAI, Type } from "@google/genai";

// Models
export const MODEL_CHAT = 'gemini-3-pro-preview';
export const MODEL_VISION = 'gemini-3-pro-preview';
export const MODEL_IMAGE_GEN = 'gemini-3-pro-image-preview';
export const MODEL_VIDEO_GEN = 'veo-3.1-fast-generate-preview';

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateText = async (prompt: string, history: {role: string, parts: {text: string}[]}[] = [], useSearch = false) => {
  const ai = getAiClient();
  
  const tools = useSearch ? [{ googleSearch: {} }] : undefined;

  const response = await ai.models.generateContent({
    model: MODEL_CHAT,
    contents: [
      ...history,
      { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
      tools,
      systemInstruction: "You are Aura, a pro-level assistant for blind users. Be concise, descriptive, and helpful. Use clear language. Your creator and developer is Rashpinder.",
    }
  });

  return {
    text: response.text,
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks
  };
};

export const analyzeMedia = async (base64Data: string, mimeType: string, prompt: string) => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: MODEL_VISION,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt || "Describe this in detail for a blind user." }
      ]
    },
    config: {
        systemInstruction: "You are an expert visual interpreter for the blind. Describe scenes, text, and videos with high detail, focusing on layout, objects, colors, and actions.",
    }
  });
  return response.text;
};

export const generateImage = async (prompt: string) => {
  const ai = getAiClient();
  // Using the environment API key directly
  const response = await ai.models.generateContent({
    model: MODEL_IMAGE_GEN,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  // Extract images
  const images: string[] = [];
  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
              images.push(`data:image/png;base64,${part.inlineData.data}`);
          }
      }
  }
  return images;
};

export const generateVideo = async (prompt: string) => {
  const ai = getAiClient(); 
  
  let operation = await ai.models.generateVideos({
    model: MODEL_VIDEO_GEN,
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({operation});
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");
  
  // Fetch the actual video bytes using the environment key
  const res = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};