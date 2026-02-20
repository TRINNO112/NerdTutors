export default async function handler(req, res) {
    console.log("📸 OCR-EVALUATE HANDLER STARTED");

    // ===== CORS =====
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    // ===== Parse Body =====
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    // ===== Validate API Key =====
    const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API || process.env.GEMINI_KEY;
    if (!key) {
        console.error("❌ API Key Missing!");
        return res.status(500).json({ error: "Missing API Key in Environment Variables" });
    }

    // ===== Validate Image =====
    const { image, images, mimeType, mode, questions, question, modelAnswer, maxMarks } = body;

    // Support both single image and array of images
    const imageList = images || (image ? [{ data: image, mimeType: mimeType || 'image/jpeg' }] : []);

    if (imageList.length === 0) {
        return res.status(400).json({ error: "No image provided. Send base64 image data." });
    }

    // ===== Model =====
    const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    // ===== Build Prompt Based on Mode =====
    let textPrompt = "";

    if (mode === "full-sheet" && Array.isArray(questions) && questions.length > 0) {
        // ========== FULL SHEET MODE ==========
        // Student uploads ONE photo with all answers, we provide questions list
        console.log(`📄 FULL SHEET MODE: ${questions.length} questions`);

        const questionsList = questions.map((q, i) => `
      Q${i + 1} (ID: ${q.id}):
      Question: ${q.text}
      Model Answer: ${q.modelAnswer || 'Not provided'}
      Max Marks: ${q.marks || 5}
    `).join("\n");

        textPrompt = `You are an expert teacher evaluating a student's handwritten/printed answer sheet.

⚠️ STRICT RELEVANCE ENFORCEMENT (MUST FOLLOW):
Before grading ANY answer, you MUST first verify that the student's answer is actually about the question asked.
- If the student wrote an answer about a COMPLETELY DIFFERENT TOPIC (e.g., notice writing, letter writing, a different chapter, a different subject), give score = 0 IMMEDIATELY. Do NOT evaluate quality, grammar, or structure of irrelevant content.
- If the student uploaded a GRAPH, DIAGRAM, or CHART that does not relate to the specific question asked (e.g., an MR/MC curve diagram for a question about scarcity), give score = 0 IMMEDIATELY.
- If the content is from a different subject entirely, score = 0.
- ONLY grade on merit if the answer genuinely attempts to address the specific question.
- Partial relevance (mentions the topic but doesn't answer correctly) = reduced marks but NOT zero.
- Complete irrelevance = ZERO. No exceptions. No partial credit for writing quality.

IMPORTANT INSTRUCTIONS:
1. First, carefully READ and EXTRACT all the text visible in ${imageList.length > 1 ? 'these answer sheet images (the student has uploaded multiple pages)' : 'this answer sheet image'}.
2. The student may have numbered their answers (Q1, Q2, Ans 1, etc.) — identify which answer corresponds to which question.
3. If an answer for a question is not found in the image, mark it as "Not attempted" with score 0.
4. For each answer, FIRST check relevance, THEN evaluate if relevant.

QUESTIONS TO EVALUATE:
${questionsList}

Return STRICT JSON only (no markdown, no code blocks):
{
  "extractedText": "The full raw text you extracted from the image(s)",
  "results": [
    {
      "questionId": "ID_FROM_INPUT",
      "questionNumber": 1,
      "extractedAnswer": "The specific text you identified as the answer for this question",
      "isRelevant": true or false,
      "score": <number>,
      "maxMarks": <number>,
      "improvements": ["suggestion1", "suggestion2"],
      "feedback": "Detailed feedback — if irrelevant, explain WHY it is irrelevant and what was expected"
    }
  ],
  "totalScore": <number>,
  "totalMaxMarks": <number>,
  "overallFeedback": "General feedback on the entire answer sheet"
}`;

    } else {
        // ========== SINGLE ANSWER MODE ==========
        // Student uploads ONE photo for ONE question
        console.log("📸 SINGLE ANSWER MODE");

        const q = question || "Not specified — please evaluate the answer in the image.";
        const ma = modelAnswer || "Not provided — evaluate based on general knowledge.";
        const mm = maxMarks || 5;

        textPrompt = `You are an expert teacher evaluating a student's handwritten/printed answer.

⚠️ STRICT RELEVANCE ENFORCEMENT (MUST FOLLOW):
Before grading, you MUST verify that the student's answer is actually about the question asked.
- If the student wrote an answer about a COMPLETELY DIFFERENT TOPIC (e.g., notice writing, letter writing, a different chapter, a different subject), give score = 0 IMMEDIATELY. Do NOT evaluate quality, grammar, or structure.
- If the student uploaded a GRAPH, DIAGRAM, or CHART that does not relate to the specific question (e.g., an MR/MC curve for a question about scarcity), give score = 0 IMMEDIATELY.
- If the content is from a different subject entirely, score = 0.
- ONLY grade on merit if the answer genuinely attempts to address the specific question.
- Partial relevance = reduced marks. Complete irrelevance = ZERO. No exceptions.

IMPORTANT INSTRUCTIONS:
1. First, READ and EXTRACT all the text written in ${imageList.length > 1 ? 'these images (the student uploaded multiple pages for one answer)' : 'this image'}.
2. This is the student's answer to the question below.
3. FIRST check relevance, THEN evaluate if relevant.

Question: ${q}
Model Answer: ${ma}
Max Marks: ${mm}

Return STRICT JSON only (no markdown, no code blocks):
{
  "extractedText": "The full raw text you extracted from the image(s)",
  "isRelevant": true or false,
  "score": <number>,
  "maxMarks": ${mm},
  "improvements": ["suggestion1", "suggestion2"],
  "feedback": "Detailed feedback — if irrelevant, explain WHY and what was expected"
}`;
    }

    // Build image parts for all uploaded pages
    const imageParts = imageList.map(img => ({
        inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: img.data
        }
    }));

    const requestBody = {
        contents: [{
            parts: [
                ...imageParts,
                {
                    text: textPrompt
                }
            ]
        }],
        generationConfig: {
            temperature: 0.2
        }
    };

    // ===== Call Gemini =====
    async function callGemini() {
        const response = await fetch(`${MODEL_URL}?key=${key}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const raw = await response.text();
        if (!response.ok) throw new Error(raw);
        return JSON.parse(raw);
    }

    try {
        console.log("📤 Sending image to Gemini Vision...");
        const geminiJson = await callGemini();
        const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const clean = text.replace(/```json|```/g, "").trim();
        console.log("🧼 CLEAN JSON received from Gemini Vision");

        const result = JSON.parse(clean);
        return res.status(200).json(result);

    } catch (err) {
        console.error("❌ OCR Evaluation Error:", err);
        return res.status(500).json({
            error: "OCR evaluation failed",
            details: err.message || "Unknown error",
            extractedText: "",
            score: 0,
            feedback: "The system could not process the image. Please try again with a clearer photo."
        });
    }
}
