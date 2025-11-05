// ai-moderation-script.js
// Simple AI chatbot with moderation checks

require('dotenv').config();
const readline = require('readline');

// Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BANNED_WORDS = ['kill', 'hack', 'bomb', 'exploit'];

// System prompt defines AI behavior
const SYSTEM_PROMPT = "You are a polite and helpful assistant that refuses harmful requests.";

// Create interface for command-line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Input moderation: Check for banned words
function moderateInput(text) {
  const lowerText = text.toLowerCase();
  const foundBanned = BANNED_WORDS.find(word => lowerText.includes(word));
  
  if (foundBanned) {
    return { safe: false, reason: `Contains banned word: "${foundBanned}"` };
  }
  return { safe: true };
}

// Output moderation: Redact banned words
function moderateOutput(text) {
  let moderated = text;
  let hadViolation = false;
  
  BANNED_WORDS.forEach(word => {
    const regex = new RegExp(word, 'gi');
    if (regex.test(moderated)) {
      hadViolation = true;
      moderated = moderated.replace(regex, '[REDACTED]');
    }
  });
  
  return { text: moderated, hadViolation };
}

// Call OpenRouter API
async function callAI(userPrompt) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'AI Moderation Script'
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data.choices[0].message.content;
}

// Main chat function
async function chat() {
  console.log('🤖 AI Moderation Chat Started');
  console.log('Type your message (or "exit" to quit)\n');

  const askQuestion = () => {
    rl.question('You: ', async (userInput) => {
      const trimmed = userInput.trim();
      
      // Exit command
      if (trimmed.toLowerCase() === 'exit') {
        console.log('👋 Goodbye!');
        rl.close();
        return;
      }

      if (!trimmed) {
        askQuestion();
        return;
      }

      // Step 1: Input Moderation
      const inputCheck = moderateInput(trimmed);
      if (!inputCheck.safe) {
        console.log(`\n❌ Your input violated the moderation policy.`);
        console.log(`   Reason: ${inputCheck.reason}\n`);
        askQuestion();
        return;
      }

      try {
        // Step 2: Call AI API
        console.log('🔄 Thinking...');
        const aiResponse = await callAI(trimmed);

        // Step 3: Output Moderation
        const outputCheck = moderateOutput(aiResponse);
        
        if (outputCheck.hadViolation) {
          console.log('\n⚠️  AI response contained inappropriate content (redacted)');
        }
        
        console.log(`\nAI: ${outputCheck.text}\n`);

      } catch (error) {
        console.error('\n❌ Error:', error.message, '\n');
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Check if API key is loaded
if (!OPENROUTER_API_KEY) {
  console.error('❌ ERROR: OPENROUTER_API_KEY not found in .env file');
  console.error('Please create a .env file with: OPENROUTER_API_KEY=your-key-here');
  process.exit(1);
}

// Start the chat
chat();