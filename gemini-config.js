// 🔹 Gemini API Configuration (Secure - Uses Vercel Backend)

// IMPORTANT: API key is now stored securely in Vercel environment variables
// This file only contains the client-side function to call the backend

// 🔹 Main Evaluation Function (Now calls Vercel backend)
export async function evaluateWithGemini({ question, modelAnswer, studentAnswer, maxMarks }) {
    try {
        console.log('📤 Sending evaluation request to secure backend...');
        
        // Call Vercel serverless function instead of direct API call
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question,
                modelAnswer: modelAnswer || 'No model answer provided.',
                studentAnswer,
                maxMarks
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Backend error:', errorData);
            throw new Error(errorData.error || `Backend error: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Evaluation received from backend:', result);

        return {
            score: result.score ?? 0,
            improvements: result.improvements ?? [],
            feedback: result.feedback ?? "No feedback available."
        };

    } catch (error) {
        console.error('❌ Gemini evaluation error:', error);
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

console.log("✅ Gemini API configured successfully (using secure backend)");