export type QuizQuestion = {
  question: string;
  options: string[];
  answer: "A" | "B" | "C" | "D";
};

export type QuizPayload = {
  subject: string;
  questions: QuizQuestion[];
};

export default async function callAI(
  prompt: string
): Promise<QuizPayload | null> {
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.error("Server error:", response.statusText);
      return null;
    }

    const data = await response.json();
    const result =
      typeof data.result === "string" ? JSON.parse(data.result) : data.result;
    return result ?? null;
  } catch (error) {
    console.error("Error calling AI API:", error);
    return null;
  }
}
