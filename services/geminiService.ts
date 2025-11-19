import { GoogleGenAI, Modality } from "@google/genai";
import { ToolId } from "../types";

// Standard client using env key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTextContent = async (
  prompt: string,
  modelId: string,
  base64Image?: string
) => {
  try {
    const contents: any = base64Image
      ? {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            { text: prompt },
          ],
        }
      : prompt;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
    });
    return { text: response.text };
  } catch (error: any) {
    console.error("Generate Text Error:", error);
    throw new Error(error.message || "Failed to generate text");
  }
};

export const generateWithGrounding = async (
  prompt: string,
  type: 'search' | 'maps',
  coords?: { lat: number; lng: number }
) => {
  try {
    const tools: any[] = [];
    const toolConfig: any = {};

    if (type === 'search') {
      tools.push({ googleSearch: {} });
    } else if (type === 'maps') {
      tools.push({ googleMaps: {} });
      if (coords) {
        toolConfig.retrievalConfig = {
            latLng: {
                latitude: coords.lat,
                longitude: coords.lng
            }
        };
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools,
        toolConfig: type === 'maps' ? toolConfig : undefined,
      },
    });

    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error: any) {
    console.error("Grounding Error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string) => {
  try {
    // Using imagen 4.0 if available or flash-image
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
        }
    });
    
    const base64 = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    // Fallback to Gemini Flash Image if Imagen fails or not accessible
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        // Extract image from parts
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No image returned");
    } catch (e: any) {
        throw new Error("Image gen failed: " + e.message);
    }
  }
};

export const editImage = async (prompt: string, base64Image: string) => {
    try {
        // Clean base64 string
        const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
                    { text: prompt }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error("No edited image returned");
    } catch (error: any) {
        throw new Error("Image edit failed: " + error.message);
    }
}

export const generateSpeech = async (text: string) => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            }
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");
        return base64Audio;
    } catch (error: any) {
        console.error("TTS Error", error);
        throw error;
    }
}

// Veo Video Generation - REQUIRES USER SELECTED KEY
export const generateVeoVideo = async (prompt: string) => {
    // We need a fresh client because Veo might require key selection
    // Use the window.aistudio check in component, here we assume we can call it.
    // Note: We are NOT passing apiKey here because window.aistudio handles it for Veo 
    // if we are in that specific context, but strictly following prompt guidelines:
    // "Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key"
    // However, Veo specifically uses `window.aistudio` selected key context often. 
    // Standard logic:
    
    const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY }); 
    
    let operation = await veoAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });
    
    return operation;
}

export const checkVeoOperation = async (operation: any) => {
     const veoAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
     return await veoAi.operations.getVideosOperation({ operation: operation });
}

export const getLiveSession = async (callbacks: any) => {
    const liveAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return liveAi.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "You are a helpful AI teaching assistant. Be concise.",
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
        }
    });
}
