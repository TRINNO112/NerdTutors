const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { studentName, questionId, question, studentAnswer, modelAnswer } = req.body;
        
        if (!studentAnswer || !modelAnswer || !question) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Prepare the prompt for Gemini
        const prompt = `
        You are an expert writing teacher evaluating a student's written response.
        
        Question: ${question}
        
        Model Answer: ${modelAnswer}
        
        Student's Answer: ${studentAnswer}
        
        Please evaluate the student's answer and provide:
        1. A score out of 100 based on:
           - Understanding of the question (30%)
           - Content quality and relevance (30%)
           - Grammar and writing structure (20%)
           - Vocabulary and expression (20%)
        
        2. A detailed feedback paragraph (100-150 words) highlighting strengths and areas for improvement
        
        3. A list of 3-5 specific improvement points
        
        Format your response as JSON:
        {
            "score": [number 0-100],
            "feedback": "[detailed feedback text]",
            "improvements": ["improvement 1", "improvement 2", "improvement 3"]
        }
        `;
        
        // Get the generative model
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response from Gemini
        // Clean the response to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Invalid response format from AI');
        }
        
        const evaluation = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (!evaluation.score || !evaluation.feedback || !evaluation.improvements) {
            throw new Error('Incomplete evaluation from AI');
        }
        
        // Return the evaluation
        res.status(200).json({
            score: Math.min(100, Math.max(0, evaluation.score)),
            feedback: evaluation.feedback,
            improvements: evaluation.improvements,
            evaluatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Evaluation error:', error);
        res.status(500).json({ 
            error: 'Failed to evaluate answer',
            details: error.message 
        });
    }
};