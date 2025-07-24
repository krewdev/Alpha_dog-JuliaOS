/*
  Agents/sentimentAgent.js
  -----------------------------------
  Purpose: Pull recent tweets mentioning the token address or symbol and summarise
  social sentiment with Gemini.
*/
const { TwitterApi } = require("twitter-api-v2");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- ENV VARS ---
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
if (!TWITTER_BEARER_TOKEN) console.warn("⚠️  Missing TWITTER_BEARER_TOKEN env var – social sentiment will be skipped.");

// Gemini setup (reuse Flash for faster summarisation)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function fetchTweets(query) {
  if (!TWITTER_BEARER_TOKEN) return [];
  try {
    const twitterClient = new TwitterApi(TWITTER_BEARER_TOKEN);
    const roClient = twitterClient.readOnly;
    const searchResp = await roClient.v2.search(query, { max_results: 20, "tweet.fields": "created_at,public_metrics" });
    return searchResp?.data?.data || [];
  } catch (err) {
    console.error("[SentimentAgent] Error fetching tweets:", err.message);
    return [];
  }
}

async function analyseSentiment(tokenAddress, symbol) {
  const tweets = await fetchTweets(symbol ? `${symbol} OR ${tokenAddress}` : tokenAddress);
  if (!tweets.length) return "No recent tweets found.";

  const tweetTexts = tweets.map(t => `- ${t.text.replace(/\n/g, " ")}`).join("\n");
  const prompt = `You are a crypto social analyst. Given these recent tweets, provide a concise (2-3 sentences) sentiment summary (bullish, bearish, neutral) and highlight any common themes.\nTweets:\n${tweetTexts}`;
  try {
    const result = await model.generateContent(prompt);
    return result?.response?.text() || "Could not generate sentiment.";
  } catch (err) {
    console.error("[SentimentAgent] Error generating sentiment:", err.message);
    return "Could not generate sentiment.";
  }
}

module.exports = { analyseSentiment };