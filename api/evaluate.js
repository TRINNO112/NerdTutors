export default async function handler(req, res) {
  console.log("🚀 NEW HANDLER STARTED");

  // ===== CORS =====
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ===== Parse Body =====
  let body = req.body;
  if (typeof body === "string") body = JSON.parse(body);

  let { question, modelAnswer, studentAnswer, maxMarks } = body;

  // Normalize undefined → ""
  question = question || "";
  modelAnswer = modelAnswer || "The official solution was not provided.";
  studentAnswer = studentAnswer || "";
  maxMarks = maxMarks || 5;

  console.log("🧩 FINAL INPUT SENT TO GEMINI:", {
    question,
    modelAnswer,
    studentAnswer,
    maxMarks
  });

  // ===== Validate API Key =====
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Missing API Key" });

  // ===== Model (Stable & Supported) =====
  const MODEL_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

  // ===== Prompt =====
  const prompt = `
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

  console.log("📤 PROMPT SENT:", prompt);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 256 }
  };

  async function callGemini() {
    const response = await fetch(`${MODEL_URL}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const raw = await response.text();
    console.log("📄 RAW GEMINI RESPONSE:", raw);

    if (!response.ok) throw new Error(raw);

    return JSON.parse(raw);
  }

  let geminiJson;

  // ===== Retry Logic (Fixes first question issue) =====
  try {
    geminiJson = await callGemini();
  } catch (err) {
    console.log("⚠️ FIRST CALL FAILED, RETRYING ONCE...");
    try {
      geminiJson = await callGemini();
    } catch (err2) {
      console.log("❌ RETRY FAILED:", err2);
      return res.status(200).json({
        score: 0,
        improvements: ["Evaluation failed.", "AI could not process the response."],
        feedback: "Try again later."
      });
    }
  }

  const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // ===== Clean JSON =====
  const clean = text.replace(/```json|```/g, "").trim();
  console.log("🧼 CLEAN JSON:", clean);

  let result;
  try {
    result = JSON.parse(clean);
  } catch (err) {
    console.log("⚠️ FALLBACK PARSE FAILED:", err);
    return res.status(200).json({
      score: 0,
      improvements: ["AI returned bad JSON.", clean],
      feedback: "Evaluation could not be parsed."
    });
  }

  console.log("🎉 FINAL RESULT:", result);

  return res.status(200).json(result);
}
