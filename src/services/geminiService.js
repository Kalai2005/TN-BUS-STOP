import { GoogleGenAI } from "@google/genai";

let aiInstance = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function getTravelAdvice(source, destination) {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide travel advice for a bus journey from ${source} to ${destination} in Tamil Nadu. Include best time to travel, what to carry, and any famous stops along the way. Keep it concise.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    if (error.message && error.message.includes("API key not valid")) {
      return "Travel advice currently unavailable due to an API key issue. Please check your configuration.";
    }
    return "Travel advice currently unavailable.";
  }
}
