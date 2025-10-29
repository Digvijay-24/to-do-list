
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ResearchResult, Subtask } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const breakDownTask = async (taskText: string): Promise<Subtask[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: `Break down the following to-do item into a list of smaller, actionable sub-tasks. Provide the response as a JSON array of objects, where each object has 'text' and 'completed' properties. The 'completed' property should be false. Task: "${taskText}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: {
                                type: Type.STRING,
                                description: 'The text of the sub-task.',
                            },
                            completed: {
                                type: Type.BOOLEAN,
                                description: 'The completion status of the sub-task.',
                            },
                        },
                         required: ['text', 'completed'],
                    },
                },
            },
        });
        const jsonText = response.text.trim();
        const subtasksData = JSON.parse(jsonText);
        return subtasksData.map((subtask: { text: string; completed: boolean; }) => ({
            ...subtask,
            id: self.crypto.randomUUID(),
        }));
    } catch (error) {
        console.error("Error breaking down task:", error);
        throw new Error("Failed to break down task. Please check the console for details.");
    }
};

export const researchTopic = async (topic: string): Promise<ResearchResult> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Research the following topic and provide a concise summary. Topic: "${topic}"`,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const summary = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const sources = groundingChunks
            .map(chunk => chunk.web)
            .filter(web => web && web.uri && web.title)
            .map(web => ({ uri: web.uri as string, title: web.title as string }));

        return { summary, sources };
    } catch (error) {
        console.error("Error researching topic:", error);
        throw new Error("Failed to research topic. Please check the console for details.");
    }
};

export const readTextAloud = async (text: string): Promise<string> => {
    if (!text.trim()) {
        return "";
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Read the following to-do list: ${text}` }] }],
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
        if (!base64Audio) {
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error with Text-to-Speech:", error);
        throw new Error("Failed to generate audio. Please check the console for details.");
    }
};
