// Simple backend endpoint for text rewriting
// This would be deployed to your server (e.g., Vercel, Netlify Functions, etc.)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, prompt } = req.body;

    if (!text || !prompt) {
      return res.status(400).json({ error: 'Missing text or prompt' });
    }

    // Here you would integrate with your preferred AI service
    // Examples: OpenAI GPT, Anthropic Claude, Google PaLM, etc.
    
    // For demo purposes, using a simple transformation
    const rewrittenText = await simpleRewrite(text);
    
    res.status(200).json({ 
      rewrittenText,
      originalText: text 
    });

  } catch (error) {
    console.error('Rewrite API error:', error);
    res.status(500).json({ error: 'Failed to rewrite text' });
  }
}

async function simpleRewrite(text) {
  // Enhanced local rewriting with more sophisticated patterns
  const replacements = [
    // Aggressive language
    { pattern: /\b(hate|hates|hating)\b/gi, replacement: 'dislike' },
    { pattern: /\b(stupid|dumb|idiotic|moronic)\b/gi, replacement: 'misguided' },
    { pattern: /\b(terrible|awful|horrible|disgusting)\b/gi, replacement: 'challenging' },
    { pattern: /\b(angry|furious|enraged|livid)\b/gi, replacement: 'concerned' },
    { pattern: /\b(destroy|demolish|crush|annihilate)\b/gi, replacement: 'address' },
    { pattern: /\b(fight|battle|war|combat)\b/gi, replacement: 'discussion' },
    
    // Extreme expressions
    { pattern: /!{2,}/g, replacement: '.' },
    { pattern: /\b(NEVER|ALWAYS)\b/g, replacement: (match) => match.toLowerCase() },
    { pattern: /\b(everyone|nobody)\b/gi, replacement: 'some people' },
    
    // Inflammatory words
    { pattern: /\b(outrageous|ridiculous|insane)\b/gi, replacement: 'surprising' },
    { pattern: /\b(pathetic|worthless)\b/gi, replacement: 'imperfect' },
    { pattern: /\b(disaster|catastrophe)\b/gi, replacement: 'setback' }
  ];

  let rewritten = text;
  
  // Apply replacements
  replacements.forEach(({ pattern, replacement }) => {
    rewritten = rewritten.replace(pattern, replacement);
  });

  // Add gentle framing for very negative content
  const negativeWords = /\b(hate|stupid|terrible|angry|disgusting|destroy|fight)\b/gi;
  if (text.match(negativeWords)) {
    rewritten = "Here's a gentler perspective: " + rewritten;
  }

  // Soften absolute statements
  rewritten = rewritten.replace(/\b(This is)\b/gi, 'This seems to be');
  rewritten = rewritten.replace(/\b(You are)\b/gi, 'You might be');
  rewritten = rewritten.replace(/\b(will never)\b/gi, 'might not');

  return rewritten;
}

// --- Alternative: Integration with Together AI (Llama-3) ---
import { Together } from "together-ai";

const client = new Together({
  apiKey: process.env.TOGETHER_API_KEY, // Put your key in .env
});

// Replace or add this handler for Together AI usage
export async function togetherAIHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text } = req.body;
    const prompt = `Rewrite this to be calm, kind, and uplifting:\n"${text}"`;

    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const rewrittenText = response.choices[0].message.content;
    res.status(200).json({ rewrittenText, originalText: text });

  } catch (err) {
    console.error("Rewrite error:", err);
    res.status(500).json({ error: "Failed to rewrite text" });
  }
}

// Alternative: Integration with OpenAI GPT
/*async function rewriteWithOpenAI(text, prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing. Set OPENAI_API_KEY in environment variables.');
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that rewrites text to be more calm, kind, and gentle while preserving the core meaning.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })
  });

  const data = await response.json();
  return data.choices[0].message.content.trim();
}*/