
import { GoogleGenAI } from "@google/genai";
import { UserType, DonatedItem, ChatMessage } from '../types';

// IMPORTANT: This key is managed by the environment and must not be hardcoded.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you might have a more robust error handling or fallback mechanism.
  console.error("Gemini API key is not set. Chat functionality will be limited.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const generateChatReply = async (
  chatHistory: ChatMessage[],
  item: DonatedItem,
  roleToSimulate: UserType
): Promise<string> => {
  if (!API_KEY) {
    return Promise.resolve("Thank you for your message. We will get back to you shortly.");
  }
  
  const model = 'gemini-2.5-flash';

  const history = chatHistory.map(message => ({
    role: message.senderId.includes('ai-') ? 'model' : 'user',
    parts: [{ text: message.text }]
  })).slice(-10); // Use last 10 messages for context

  const roleDescription = roleToSimulate === UserType.Donor 
    ? "You are a friendly Donor who wants to donate an item."
    : "You are a representative from a verified NGO, coordinating the pickup of a donated item.";

  const systemInstruction = `You are simulating a conversation on AidBridge.
  ${roleDescription}
  The conversation is about the item: "${item.itemName}".
  Keep your replies concise, friendly, and focused on arranging the donation. Do not use markdown.`;

  try {
    const chat = ai.chats.create({
      model: model,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } // For faster responses
      },
      history
    });

    const lastMessage = chatHistory[chatHistory.length - 1].text;
    const response = await chat.sendMessage({ message: lastMessage });
    
    return response.text;
  } catch (error) {
    console.error("Error generating chat reply:", error);
    return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
  }
};

export const getDonorReply = (chatHistory: ChatMessage[], item: DonatedItem) => 
  generateChatReply(chatHistory, item, UserType.Donor);

export const getNgoReply = (chatHistory: ChatMessage[], item: DonatedItem) =>
  generateChatReply(chatHistory, item, UserType.NGO);
