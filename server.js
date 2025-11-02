const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Check API key loaded
console.log("🔑 API Key Loaded:", process.env.OPENROUTER_API_KEY ? "✅ Yes" : "❌ No");

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const bannedWords = ["kill", "hack", "bomb"];

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/api/chat", async (req, res) => {
  const userPrompt = req.body.prompt;
  console.log("🟢 Incoming Prompt:", userPrompt);

  if (bannedWords.some(word => userPrompt.toLowerCase().includes(word))) {
    console.log("🚫 Blocked for banned word.");
    return res.json({ response: "❌ Your input violated the moderation policy." });
  }

  try {
    console.log("📡 Sending request to OpenRouter...");

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Moderation App",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a polite and helpful assistant." },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    console.log("🌐 API Status:", response.status);

    const text = await response.text();
    console.log("🧾 Raw API Response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("❌ Failed to parse JSON:", err);
      return res.status(500).json({ response: "Invalid API response. Check logs." });
    }

    let aiResponse = data.choices?.[0]?.message?.content || "No response received.";

    if (bannedWords.some(word => aiResponse.toLowerCase().includes(word))) {
      aiResponse = "[REDACTED — output violated moderation policy]";
    }

    res.json({ response: aiResponse });

  } catch (error) {
    console.error("🔥 Fetch Error:", error);
    res.status(500).json({ response: "Server error. Try again later." });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
