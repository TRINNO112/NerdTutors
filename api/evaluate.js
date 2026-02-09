export default async function handler(req, res) {
  console.log("🚀 EVALUATE HANDLER STARTED"); // Force redeploy check

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
  // ===== Validate API Key =====
  // Check multiple common names in case of typo in Vercel Settings
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API || process.env.GEMINI_KEY;
  if (!key) {
    console.error("❌ API Key Missing! Checked: GEMINI_API_KEY, GEMINI_API, GEMINI_KEY");
    return res.status(500).json({ error: "Missing API Key in Environment Variables" });
  }

  // ===== Check for Batch or Single Request =====
  const isBatch = Array.isArray(body.questions);

  // ===== Model =====
  // ===== Model =====
  // Switch to `gemini-1.5-flash` stable endpoint or `gemini-pro` if flash is unavailable in this region/key.
  // Using `gemini-1.5-flash` which is generally available.
  const MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  let prompt = "";

  if (isBatch) {
    console.log(`📦 BATCH REQUEST: ${body.questions.length} questions`);
    const questionsPrompt = body.questions.map((q, index) => `
      ---
      ID: ${q.id}
      Question ${index + 1}: ${q.text}
      Model Answer: ${q.modelAnswer || 'None'}
      Student Answer: ${body.answers[q.id] || 'No answer'}
      Max Marks: ${q.marks || 10}
      ---
      `).join('\n');

    prompt = `
      You are an expert economics teacher. Evaluate the following ${body.questions.length} student answers.
      
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
  } else {
    console.log("👤 SINGLE REQUEST");
    let { question, modelAnswer, studentAnswer, maxMarks } = body;
    question = question || "";
    modelAnswer = modelAnswer || "The official solution was not provided.";
    studentAnswer = studentAnswer || "";
    maxMarks = maxMarks || 5;

    prompt = `
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
  }

  console.log("📤 PROMPT SENT TO GEMINI...");

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 } // Removed maxOutputTokens to allow variable length for batch
  };

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
    const geminiJson = await callGemini();
    const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    console.log("🧼 CLEAN JSON received");

    const result = JSON.parse(clean);

    // Return format depends on request type
    return res.status(200).json(result);

  } catch (err) {
    console.log("❌ ERROR:", err);

    if (isBatch) {
      // Return error for batch
      return res.status(500).json({ error: "Batch evaluation failed", details: err.message });
    } else {
      // Return safe fallback for single
      return res.status(200).json({
        score: 0,
        improvements: ["Evaluation failed.", "AI error."],
        feedback: "Try again later."
      });
    }
  }
}
