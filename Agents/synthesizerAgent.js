// agents/synthesizerAgent.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Validate environment variable
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the more powerful Pro model for the final synthesis task
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

async function generateFinalReport(analysis) {
  try {
    // Validate input
    if (!analysis || typeof analysis !== 'string') {
      throw new Error('Invalid analysis data provided');
    }

    if (analysis.trim().length === 0) {
      throw new Error('Empty analysis data provided');
    }

    const prompt = `
      You are a lead alpha researcher. Your analyst has provided the following summary on a new token.
      Analyst's Summary: "${analysis}"

      Based on that summary, generate a final "Alpha Report". Structure it with three sections using Markdown:
      ### Opportunity
      What is the potential opportunity here? (1-2 sentences)
      ### Risk
      What are the clear and obvious risks? (1-2 sentences)
      ### Verdict
      A concluding thought on whether this is worth investigating further. (1 sentence)
    `;

    // Call the Gemini API
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // Validate API response
    if (!response || !response.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const text = response.text();
    
    // Validate that we got actual content
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }
    
    return text;
  } catch (error) {
    console.error('Error in generateFinalReport:', error.message);
    return `Report generation failed: ${error.message}. Please try again later.`;
  }
}

module.exports = { generateFinalReport };