import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { ChatMessage, ChatModelType } from "../types";

// Helper to ensure we have a key for paid features
const ensurePaidKey = async () => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CHAT ---

export const sendChatMessage = async (
  modelType: ChatModelType,
  message: string,
  history: ChatMessage[],
  images: string[] = [],
  videos: string[] = [],
  isThinkingMode: boolean = false,
  systemInstruction?: string
): Promise<{ text: string; groundingUrls?: Array<{ title: string; uri: string }> }> => {
  
  const ai = getClient();
  
  let modelName: string = modelType;
  let config: any = {};
  
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  // Specific configurations based on feature requests
  if (isThinkingMode) {
    modelName = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
  } else if (modelType === ChatModelType.FLASH_SEARCH) {
    config.tools = [{ googleSearch: {} }];
  }

  // Construct contents with history
  // Simplified for this demo: We will just send the current message with context 
  // normally you'd map the whole history. 
  // For simplicity + multimedia, we'll format the *current* request properly.
  
  const parts: any[] = [{ text: message }];
  
  images.forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: img } });
  });

  videos.forEach(vid => {
    parts.push({ inlineData: { mimeType: 'video/mp4', data: vid } });
  });

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config,
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const groundingUrls = groundingChunks?.map((chunk: any) => chunk.web).filter((w: any) => w);

  return {
    text: response.text || "No text response generated.",
    groundingUrls
  };
};

// --- IMAGES ---

export const generateImage = async (prompt: string, aspectRatio: string) => {
  await ensurePaidKey();
  const ai = getClient();
  
  // Using gemini-3-pro-image-preview for high quality generation
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any, 
        imageSize: "1K"
      }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

export const editImage = async (base64Image: string, prompt: string) => {
  const ai = getClient();
  // Using gemini-2.5-flash-image (nano banana) for editing
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: prompt }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image returned");
};

export const analyzeMedia = async (fileBase64: string, mimeType: string, prompt: string) => {
  const ai = getClient();
  // Using gemini-3-pro-preview for deep analysis
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: fileBase64 } },
        { text: prompt }
      ]
    }
  });
  return response.text;
};

// --- VIDEO (VEO) ---

export const generateVeoVideo = async (prompt: string, aspectRatio: '16:9'|'9:16', imageBase64?: string) => {
  await ensurePaidKey();
  const ai = getClient();
  const model = 'veo-3.1-fast-generate-preview';

  let request: any = {
    model,
    prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio,
    }
  };

  if (imageBase64) {
    request.image = {
      imageBytes: imageBase64,
      mimeType: 'image/png'
    };
  }

  let operation = await ai.models.generateVideos(request);

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!uri) throw new Error("Video generation failed");

  // Fetch with key
  const videoRes = await fetch(`${uri}&key=${process.env.API_KEY}`);
  const blob = await videoRes.blob();
  return URL.createObjectURL(blob);
};

// --- AUDIO ---

export const transcribeAudio = async (audioBase64: string) => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
        { text: "Transcribe this audio." }
      ]
    }
  });
  return response.text;
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio generated");

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const binaryString = atob(base64Audio);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return await ctx.decodeAudioData(bytes.buffer);
};