// api/evaluate.js — ULTRA DEBUG VERSION (BRO MODE)

export default async function handler(req, res) {
  console.log("🚀 FUNCTION STARTED");
  console.log("📌 Request method:", req.method);
  console.log("📌 Raw req.body:", req.body);

  // ================= CORS ==================
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    console.log("🔧 CORS preflight hit");
    return res.status(200).json({ status: "ok" });
  }

  if (req.method !== "POST") {
    console.log("❌ Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ================= Parse Body ==================
  console.log("🔍 Parsing request body...");

  let body = req.body;
  try {
    if (typeof body === "string") {
      console.log("🔄 Body is string, parsing JSON...");
      body = JSON.parse(body);
    }
  } catch (err) {
    console.log("❌ Failed to parse body:", err);
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  console.log("✅ Parsed body:", body);

  const { question, modelAnswer, studentAnswer, maxMarks } = body;
  console.log("📌 Extracted fields:", { question, modelAnswer, studentAnswer, maxMarks });

  if (!question || !studentAnswer || !maxMarks) {
    console.log("❌ Missing fields");
    return res.status(400).json({ error: "Missing required fields" });
  }

  // ================= ENV CHECK ==================
  console.log("🔍 Checking Gemini API key presence...");
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.log("❌ GEMINI_API_KEY is missing");
    return res.status(500).json({ error: "API key missing" });
  }

  console.log("✅ GEMINI_API_KEY exists");

  // ================= Build Prompt ==================
 const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

  const prompt = `
Evaluate as an economics expert. Strict JSON ONLY.

Question: ${question}
Model Answer: ${modelAnswer}
Student Answer: ${studentAnswer}
Maximum Marks: ${maxMarks}

Return JSON:
{
  "score": <0-${maxMarks}>,
  "improvements": ["...", "..."],
  "feedback": "..."
}
`;

  console.log("🧠 Prompt being sent:", prompt);

  // ================= Gemini Request ==================
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 512,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  console.log("📤 Sending Gemini request:", JSON.stringify(requestBody, null, 2));

  let apiResponse;

  try {
    apiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    console.log("❌ NETWORK ERROR sending to Gemini:", err);
    return res.status(500).json({
      error: "Network failure contacting Gemini",
      details: err.message
    });
  }

  console.log("📥 Gemini HTTP status:", apiResponse.status);

  const rawResponseText = await apiResponse.text();
  console.log("📄 RAW Gemini response:", rawResponseText);

  if (!apiResponse.ok) {
    console.log("❌ Gemini error response:", rawResponseText);
    return res.status(500).json({
      error: "Gemini API returned an error",
      status: apiResponse.status,
      body: rawResponseText
    });
  }

  // ================= Parse Gemini JSON ==================
  let geminiJson;

  try {
    geminiJson = JSON.parse(rawResponseText);
    console.log("📌 Parsed Gemini JSON:", geminiJson);
  } catch (err) {
    console.log("❌ Failed to parse Gemini JSON:", err);
    return res.status(500).json({
      error: "Gemini returned invalid JSON",
      raw: rawResponseText
    });
  }

  const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("📌 Extracted model text:", text);

  if (!text) {
    console.log("❌ Gemini returned no text");
    return res.status(500).json({ error: "Empty model response" });
  }

  // ================= Clean JSON text ==================
  const cleanText = text
    .replace(/```json|```/g, "")
    .replace(/\n+/g, " ")
    .trim();

  console.log("🧹 Clean JSON string:", cleanText);

  let finalJson;
  try {
    finalJson = JSON.parse(cleanText);
    console.log("✅ FINAL parsed JSON:", finalJson);
  } catch (err) {
    console.log("❌ JSON parse error:", err);
    return res.status(200).json({
      score: 0,
      improvements: ["Model returned non-JSON text", cleanText],
      feedback: "AI evaluation could not be parsed."
    });
  }

  fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`)
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));


  // ================= SUCCESS ==================
  console.log("🎉 SUCCESS — sending result back:", finalJson);

  return res.status(200).json({
    score: finalJson.score ?? 0,
    improvements: finalJson.improvements ?? [],
    feedback: finalJson.feedback ?? "No feedback"
  });
}