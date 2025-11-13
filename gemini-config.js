// gemini-config.js
// Gemini API Configuration

export const GEMINI_API_KEY = "AIzaSyAAdJNt55MnCC7t2aCCCO1JUFGVuuhrG34"; // Get from: https://makersuite.google.com/app/apikey

export const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Function to evaluate answer using Gemini
export async function evaluateWithGemini({ question, modelAnswer, studentAnswer, maxMarks }) {
    try {
        const prompt = `
You are an economics exam evaluator. Evaluate the following student answer and provide a JSON response.

**Question:** ${question}

**Model Answer:** ${modelAnswer}

**Student Answer:** ${studentAnswer}

**Maximum Marks:** ${maxMarks}

Evaluate the student answer and respond with ONLY a valid JSON object (no markdown, no extra text):
{
  "score": <number between 0 and ${maxMarks}>,
  "improvements": [
    "<specific improvement 1>",
    "<specific improvement 2>",
    "<specific improvement 3>"
  ],
  "feedback": "<brief overall feedback>"
}

Be strict but fair. Award marks based on accuracy, completeness, and use of economic terminology.
`;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract text from Gemini response
        const text = data.candidates[0].content.parts[0].text;
        
        // Clean the response - remove markdown code blocks if present
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse JSON
        const result = JSON.parse(cleanText);
        
        return {
            score: result.score || 0,
            improvements: result.improvements || [],
            feedback: result.feedback || "No feedback available"
        };

    } catch (error) {
        console.error('Gemini evaluation error:', error);
        
        // Fallback mock evaluation if Gemini fails
        return {
            score: Math.round(maxMarks * 0.5),
            improvements: [
                "Unable to evaluate with AI - please review manually",
                "Check your answer for completeness",
                "Ensure you've covered key economic concepts"
            ],
            feedback: "Automatic evaluation temporarily unavailable"
        };
    }
}

const apiKey = "AIzaSyAAdJNt55MnCC7t2aCCCO1JUFGVuuhrG34"; // replace with your Gemini API key

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(response => response.json())
  .then(data => {
    console.log("Available Models:");
    data.models.forEach(model => console.log(model.name));
  })
  .catch(error => console.error("Error fetching models:", error));


console.log("✅ Gemini API configured");

