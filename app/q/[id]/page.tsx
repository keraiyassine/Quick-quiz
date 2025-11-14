"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Question = {
  question: string;
  options: string[];
  answer: "A" | "B" | "C" | "D";
};

export default function PublicQuizPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("quizzes")
        .select("subject, questions, is_public, share_id")
        .eq("share_id", id)
        .limit(1)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (!data || !data.is_public) {
        setError("This quiz is not public or doesn’t exist.");
      } else {
        setSubject(data.subject);
        setQuestions(data.questions as Question[]);
      }
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const getOptionStyle = (i: number, letter: string, correct: string) => {
    const sel = selected[i];
    if (!sel) return "bg-gray-700 hover:bg-gray-600";
    if (letter === correct) return "bg-green-600";
    if (letter === sel && sel !== correct) return "bg-red-600";
    return "bg-gray-700 opacity-50";
  };

  const score = Object.entries(selected).reduce((acc, [idx, ans]) => {
    const q = questions[Number(idx)];
    return acc + (q && q.answer === ans ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-[60vh] text-white flex flex-col">
      {loading ? (
        <p className="text-white/80">Loading…</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="bg-white/10 mt-2 max-w-3xl w-full p-6 rounded-2xl shadow-inner backdrop-blur-md self-center">
          <h1 className="text-3xl font-bold text-amber-400 mb-4">{subject}</h1>
          <p className="mb-4 text-white/80">
            {Object.keys(selected).length} / {questions.length} answered
            {Object.keys(selected).length === questions.length && (
              <>
                {" "}
                • Score: <span className="text-emerald-400">
                  {score}
                </span> / {questions.length}
              </>
            )}
          </p>
          {questions.map((q, i) => (
            <div key={i} className="mb-6">
              <p className="font-semibold mb-2">
                {i + 1}. {q.question}
              </p>
              <div className="flex flex-col gap-2">
                {["A", "B", "C", "D"].map((letter, idx) => (
                  <button
                    key={letter}
                    onClick={() =>
                      setSelected((prev) =>
                        prev[i] ? prev : { ...prev, [i]: letter }
                      )
                    }
                    disabled={!!selected[i]}
                    className={`text-left px-4 py-2 rounded-lg transition-all ${getOptionStyle(
                      i,
                      letter,
                      q.answer
                    )}`}
                  >
                    {letter}. {q.options[idx]}
                  </button>
                ))}
              </div>
              {selected[i] && (
                <p className="mt-2 text-sm text-gray-300">
                  Correct Answer:{" "}
                  <span className="text-green-400">{q.answer}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
