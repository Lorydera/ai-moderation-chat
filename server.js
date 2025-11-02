const express = require("express");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static("public")); // serve frontend files

// Banned words for moderation
const bannedWords = ["kill", "hack", "bomb"];

// Optional root route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Chat API
app.post("/api/chat", async (req, res) => {
  const userPrompt = req.body.prompt;

  // Input moderation
  if (bannedWords.some(word => userPrompt.toLowerCase().includes(word))) {
    return res.json({ response: "❌ Your input violated the moderation policy." });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Moderation App"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a polite and helpful assistant." },
          { role: "user", content: userPrompt }
        ]
      }),
    });

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content || "No response received.";

    // Output moderation
    if (bannedWords.some(word => aiResponse.toLowerCase().includes(word))) {
      aiResponse = "[REDACTED — output violated moderation policy]";
    }

    res.json({ response: aiResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ response: "❌ Something went wrong. Please try again." });
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
