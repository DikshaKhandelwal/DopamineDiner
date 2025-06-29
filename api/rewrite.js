// Simple backend endpoint for text rewriting
// This would be deployed to your server (e.g., Vercel, Netlify Functions, etc.)
// --- New: Daily Analysis Endpoint ---
import { Together } from "together-ai";
import dotenv from "dotenv";
dotenv.config({ path: ".env" }); // or ".env.local" if you want

const apiKey =
  process.env.TOGETHER_API_KEY ||
  process.env.NEXT_PUBLIC_TOGETHER_API_KEY ||
  ""; // fallback for different env setups

const client = new Together({
  apiKey: apiKey,
});

export async function dailyAnalysisHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { scrollData, reflections } = req.body;
    if (!scrollData || !Array.isArray(reflections) || reflections.length === 0) {
      return res.status(400).json({ error: 'Missing scrollData or reflections' });
    }

    // Compose prompt for Llama-3
    const prompt = `
You are a mindful digital wellness coach. 
Given the following user's scroll behavior and their daily reflections, provide a concise, supportive summary in 50 words of their digital habits today, and offer 2-3 gentle suggestions for tomorrow. 
Be positive, constructive, and specific. 

Scroll Data (JSON): 
${JSON.stringify(scrollData, null, 2)}

Reflections:
${reflections.map((r, i) => `Reflection ${i + 1}: "${r}"`).join('\n')}

Summary & Suggestions:
`;

    const response = await client.chat.completions.create({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const summary = response.choices[0].message.content;
    res.status(200).json({ summary });

  } catch (err) {
    console.error("Daily analysis error:", err);
    res.status(500).json({ error: "Failed to generate daily analysis" });
  }
}

/*
How to test if the daily analysis API is working:

1. **Local development (Node.js/Express or Vercel/Netlify function):**
   - Start your backend server so that the endpoint is available (e.g., http://localhost:3000/api/daily-analysis).

2. **Manual test with curl:**
   - Run this in your terminal (replace the URL if needed):

     ```
     curl -X POST http://localhost:3000/api/daily-analysis \
       -H "Content-Type: application/json" \
       -d '{"scrollData":{"scrollDistance":5000,"timeSpent":1200,"tabSwitches":8},"reflections":["I felt distracted today.","I want to focus more tomorrow."]}'
     ```

   - You should get a JSON response with a `summary` field.

3. **Manual test with Postman or Insomnia:**
   - Set method to POST, URL to your endpoint.
   - Body: raw JSON, e.g.:
     ```json
     {
       "scrollData": { "scrollDistance": 5000, "timeSpent": 1200, "tabSwitches": 8 },
       "reflections": ["I felt distracted today.", "I want to focus more tomorrow."]
     }
     ```
   - Send the request and check for a summary in the response.

4. **Test from your extension:**
   - In your extension, submit a reflection and trigger the daily analysis.
   - Open the browser devtools (Network tab) and look for a POST request to `/api/daily-analysis`.
   - Check the response for a summary.

5. **Check server logs:**
   - If you have `console.log` or error output in your handler, check your server logs for errors or confirmation of requests.

6. **If deployed (e.g., Vercel/Netlify):**
   - Use the deployed URL in your curl/Postman test.

**If you get a summary in the response, your API is working.**
*/

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