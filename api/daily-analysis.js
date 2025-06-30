import { Together } from "together-ai";

const apiKey =
  process.env.TOGETHER_API_KEY ||
  process.env.NEXT_PUBLIC_TOGETHER_API_KEY ||
  "";

const client = new Together({ apiKey });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scrollData, reflections } = req.body;

    if (!scrollData || !Array.isArray(reflections) || reflections.length === 0) {
      return res.status(400).json({ error: 'Missing scrollData or reflections' });
    }

    // Convert timeSpent from seconds to minutes for the prompt
    const scrollDataForPrompt = {
      ...scrollData,
      timeSpent: scrollData.timeSpent != null
        ? `${Math.round(scrollData.timeSpent / 60)} min (${scrollData.timeSpent} sec)`
        : undefined
    };

    const prompt = `
You are a mindful digital wellness coach. 
Given the following user's scroll behavior and their daily reflections, provide a concise, supportive summary of their digital habits today, and offer 2-3 gentle suggestions for tomorrow. 
Be positive, constructive, and specific.

Scroll Data (JSON): 
${JSON.stringify(scrollDataForPrompt, null, 2)}

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
