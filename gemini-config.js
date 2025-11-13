// 🔹 Gemini API Configuration
export const GEMINI_API_KEY = "AIzaSyAs64YdqTElg7QRp8m6CWLq6Kk4RWABPEE"; // Replace with your key
export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-09-2025:generateContent";

// 🔹 Main Evaluation Function
export async function evaluateWithGemini({ question, modelAnswer, studentAnswer, maxMarks }) {
    try {
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

        if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!text) throw new Error("Empty response from Gemini.");

        // 🧹 Clean and sanitize the output
        const cleanText = text
            .replace(/```json|```/g, '')
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        let result;
        try {
            result = JSON.parse(cleanText);
        } catch (err) {
            console.warn("⚠️ Invalid JSON from Gemini. Returning fallback result.");
            console.log("Raw AI output:", cleanText);
            return {
                score: 0,
                improvements: [
                    "Response could not be parsed as JSON.",
                    "Try rephrasing or shortening the question.",
                    "AI output may have been incomplete or filtered."
                ],
                feedback: "Automatic evaluation failed. Please check manually."
            };
        }

        return {
            score: result.score ?? 0,
            improvements: result.improvements ?? [],
            feedback: result.feedback ?? "No feedback available."
        };

    } catch (error) {
        console.error('Gemini evaluation error:', error);
        return {
            score: 0,
            improvements: [
                "Unable to evaluate due to processing error.",
                "Possible issue: network, quota, or API filter.",
                "Marked for manual review."
            ],
            feedback: "Evaluation failed due to an error."
        };
    }
}

// 🔹 Optional: List available models in your console (for reference)
const API_KEY = "YOUR_API_KEY_HERE";

fetch("https://generativelanguage.googleapis.com/v1beta/models", {
  headers: { "X-Goog-Api-Key": API_KEY }
})
  .then(res => res.json())
  .then(data => console.log("📋 Available Gemini Models:", data))
  .catch(err => console.error("⚠️ Model list fetch error:", err));

console.log("✅ Gemini API configured successfully");
