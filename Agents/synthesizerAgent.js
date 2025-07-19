// agents/synthesizerAgent.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use the more powerful Pro model for the final synthesis task
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

async function generateFinalReport(analysis) {
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
  const text = response.text();
  return text;
}

module.exports = { generateFinalReport };