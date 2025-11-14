import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.AI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const chatCompletion = await groq.chat.completions.create({
      model: "qwen/qwen3-32b", // You can change to "llama-3.1-70b-versatile" if you prefer
      messages: [
        {
          role: "system",
          content: `
You are an AI that generates multiple-choice quizzes (MCQs).

You must respond with ONLY a valid JSON object — absolutely no extra text, explanations, or tags.
Do NOT include <think>, <thought>, <analysis>, or any reasoning text. If you must reason, do it silently.

If the provided request is invalid or cannot reasonably produce a quiz topic, respond with:
null

Only return null if you are certain that the input is not a valid quiz topic.

Each question must:
- Have exactly 4 options labeled A, B, C, D (in order).
- Include only one correct answer, indicated by its letter (e.g. "A", "B", "C", or "D").
- NOT include the answer text itself inside the "answer" field.
- Ensure the correct option text appears within "options" array, but "answer" only contains the letter.
- Randomize the answers

Output format:
{
  "subject": "<subject>",
  "questions": [
    {
      "question": "<string>",
      "options": ["<string>", "<string>", "<string>", "<string>"],
      "answer": "<A|B|C|D>"
    }
  ]
}
`,
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_completion_tokens: 2048,
      top_p: 0.95,
    });

    // 🧹 Clean Groq response before sending it back
    let aiReply = chatCompletion.choices[0]?.message?.content || "";

    // Remove <think> tags and their content
    aiReply = aiReply.replace(/<think>[\s\S]*?<\/think>/gi, "");

    // Remove any text before the first { and after the last }
    aiReply = aiReply.replace(/^[^{]*|[^}]*$/g, "").trim();

    // Try parsing to ensure it's valid JSON
    let parsed;
    try {
      parsed = JSON.parse(aiReply);
    } catch (err) {
      console.error("⚠️ Failed to parse JSON:", err, "\nRaw Output:", aiReply);
      return NextResponse.json(
        { error: "Invalid JSON from AI", raw: aiReply },
        { status: 500 }
      );
    }

    // ✅ Return the cleaned and parsed result
    return NextResponse.json({ result: parsed });
  } catch (error: any) {
    console.error("❌ Server Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
