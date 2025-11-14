// api/evaluate.js - Vercel Serverless Function

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { question, modelAnswer, studentAnswer, maxMarks } = req.body;

    // Validate input
    if (!question || !studentAnswer || !maxMarks) {
      return res.status(400).json({ 
        error: 'Missing required fields: question, studentAnswer, maxMarks' 
      });
    }

    // Get API key from environment variable (set in Vercel)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not found in environment');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

    const prompt = `
You are an economics exam evaluator. Evaluate the following student answer and provide a JSON response.

**Question:** ${question}
**Model Answer:** ${modelAnswer || 'No model answer provided.'}
**Student Answer:** ${studentAnswer}
**Maximum Marks:** ${maxMarks}

Respond ONLY with a valid JSON object (no markdown, no explanations, no code fences):
{
  "score": <number between 0 and ${maxMarks}>,
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>"],
  "feedback": "<brief overall feedback>"
}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      throw new Error("Empty response from Gemini.");
    }

    // Clean and parse the response
    const cleanText = text
      .replace(/```json|```/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let result;
    try {
      result = JSON.parse(cleanText);
    } catch (err) {
      console.warn("Invalid JSON from Gemini:", cleanText);
      return res.status(200).json({
        score: 0,
        improvements: [
          "Response could not be parsed as JSON.",
          "Try rephrasing or shortening the question.",
          "AI output may have been incomplete or filtered."
        ],
        feedback: "Automatic evaluation failed. Please check manually."
      });
    }

    // Return successful result
    return res.status(200).json({
      score: result.score ?? 0,
      improvements: result.improvements ?? [],
      feedback: result.feedback ?? "No feedback available."
    });

  } catch (error) {
    console.error('Evaluation error:', error);
    return res.status(500).json({
      error: 'Evaluation failed',
      message: error.message,
      score: 0,
      improvements: [
        "Unable to evaluate due to processing error.",
        "Possible issue: network, quota, or API filter.",
        "Marked for manual review."
      ],
      feedback: "Evaluation failed due to an error."
    });
  }
}