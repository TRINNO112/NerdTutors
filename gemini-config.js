// 🔹 Gemini API Configuration (Robust - Supports Vercel Backend & Client-Side Fallback)

// 🔹 Main Evaluation Function
export async function evaluateWithGemini({ question, modelAnswer, studentAnswer, maxMarks }) {
    try {
        console.log('📤 Attempting evaluation via backend...');

        // 1. Try Vercel Backend First
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, modelAnswer, studentAnswer, maxMarks })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Backend evaluation successful:', result);
            return {
                score: result.score ?? 0,
                improvements: result.improvements ?? [],
                feedback: result.feedback ?? "No feedback available."
            };
        } else {
            console.warn(`⚠️ Backend unavailable (Status: ${response.status}). Switching to client-side fallback.`);
            throw new Error('Backend failed');
        }

    } catch (error) {
        console.log('🔄 Falling back to client-side Gemini call...', error);
        return await evaluateWithClientSide({ question, modelAnswer, studentAnswer, maxMarks });
    }
}

// 🔹 Client-Side Fallback (For Local Testing / Static Hosting)
async function evaluateWithClientSide({ question, modelAnswer, studentAnswer, maxMarks }) {
    const STORAGE_KEY = 'nerdtutors_gemini_key';
    let apiKey = localStorage.getItem(STORAGE_KEY);

    if (!apiKey) {
        apiKey = prompt("⚠️ Backend not found (Local Mode). Please enter your Google Gemini API Key to continue:");
        if (!apiKey) {
            return {
                score: 0,
                feedback: "Evaluation failed: No API Key provided for local testing.",
                improvements: ["Please provide a valid Gemini API Key to test locally."]
            };
        }
        localStorage.setItem(STORAGE_KEY, apiKey);
    }

    try {
        const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

        const promptText = `
        Evaluate the student's answer strictly in JSON.
        
        Question: ${question}
        Model Answer: ${modelAnswer}
        Student Answer: ${studentAnswer}
        Max Marks: ${maxMarks}
        
        Return STRICT JSON only:
        {
            "score": <number>,
            "improvements": ["...", "..."],
            "feedback": "..."
        }
        `;

        const response = await fetch(`${MODEL_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.3 }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const result = JSON.parse(cleanJson);

        return {
            score: result.score ?? 0,
            improvements: result.improvements ?? [],
            feedback: result.feedback ?? "No feedback available."
        };

    } catch (error) {
        console.error("❌ Client-side evaluation failed:", error);

        // If INVALID_ARGUMENT (often bad key), clear it
        if (error.message.includes('INVALID_ARGUMENT') || error.message.includes('400')) {
            localStorage.removeItem(STORAGE_KEY);
        }

        return {
            score: 0,
            improvements: ["Unable to evaluate due to processing error.", error.message],
            feedback: "Evaluation failed. Please check your API Key / Network."
        };
    }
}


// 🔹 Batch Evaluation Function (Optimized for Capacity)
export async function evaluateBatchWithGemini(questions, answers) {
    try {
        console.log('📦 Attempting batch evaluation via backend...');

        // Convert answers Map to Object for JSON serialization if needed, 
        // but wait, appState.answers is a Map? Yes.
        // JSON.stringify handles Map? No, it returns {}.
        // So we must convert it.
        const answersObj = {};
        answers.forEach((value, key) => {
            answersObj[key] = value;
        });

        // 1. Try Vercel Backend First
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questions,
                answers: answersObj
            })
        });

        if (response.ok) {
            const results = await response.json();
            console.log('✅ Backend batch evaluation successful:', results);
            return results;
        } else {
            console.warn(`⚠️ Backend unavailable (Status: ${response.status}). Switching to client-side fallback.`);
            throw new Error('Backend failed');
        }

    } catch (error) {
        console.log('🔄 Falling back to client-side batch Gemini call...', error);
        return await evaluateBatchClientSide(questions, answers);
    }
}

async function evaluateBatchClientSide(questions, answers) {
    const STORAGE_KEY = 'nerdtutors_gemini_key';
    let apiKey = localStorage.getItem(STORAGE_KEY);

    if (!apiKey) {
        apiKey = prompt("⚠️ Backend not found (Local Mode). Please enter your Google Gemini API Key to continue:");
        if (!apiKey) {
            return questions.map(q => ({
                questionId: q.id,
                score: 0,
                feedback: "Evaluation failed: No API Key provided.",
                improvements: []
            }));
        }
        localStorage.setItem(STORAGE_KEY, apiKey);
    }

    try {
        const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

        // Construct a single prompt for all questions
        const questionsPrompt = questions.map((q, index) => `
        ---
        ID: ${q.id}
        Question ${index + 1}: ${q.text}
        Model Answer: ${q.modelAnswer || 'None'}
        Student Answer: ${answers.get(q.id) || 'No answer'}
        Max Marks: ${q.marks || 10}
        ---
        `).join('\n');

        const promptText = `
        You are an expert economics teacher. Evaluate the following ${questions.length} student answers.
        
        ${questionsPrompt}
        
        Return a STRICT JSON array of objects. One object per question.
        Format:
        [
            {
                "questionId": "ID_FROM_INPUT",
                "score": <number>,
                "improvements": ["...", "..."],
                "feedback": "..."
            },
            ...
        ]
        `;

        const response = await fetch(`${MODEL_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.3 }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const results = JSON.parse(cleanJson);

        return results;

    } catch (error) {
        console.error("❌ Batch evaluation failed:", error);

        // If query was too large or other error, fallback to individual checking? 
        // For now return error for all
        return questions.map(q => ({
            questionId: q.id,
            score: 0,
            feedback: "Batch evaluation failed. Please try again.",
            improvements: ["Error: " + error.message]
        }));
    }
}

console.log("✅ Gemini API configured (Backend + Client Fallback enabled)");