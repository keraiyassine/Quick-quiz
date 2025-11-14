"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import InputField from "../components/InputField";
import GenerateButton from "../components/GenerateButton";
import { supabase } from "../../lib/supabaseClient";

type Question = {
  question: string;
  options: string[];
  answer: "A" | "B" | "C" | "D";
};

type QuizData = {
  subject: string;
  questions: Question[];
};

type SavedQuiz = {
  id: string;
  subject: string;
  created_at?: string;
  is_public?: boolean;
  share_id?: string | null;
};

type ChatMessage = {
  role: "assistant";
  quiz: QuizData;
  savedQuizId?: string;
  signature?: string;
};

type AnswerMap = Record<number, string>;

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

const computeQuizSignature = (quiz: QuizData) => {
  const normalizedSubject = quiz.subject.trim().toLowerCase();
  const serializedQuestions = quiz.questions
    .map((q) => {
      const normalizedQuestion = q.question.trim().toLowerCase();
      const normalizedAnswer = q.answer.trim().toUpperCase();
      const normalizedOptions = q.options.map((option) =>
        option.trim().toLowerCase()
      );
      return [normalizedQuestion, normalizedAnswer, ...normalizedOptions].join(
        "|~|"
      );
    })
    .join("||");
  return `${normalizedSubject}::${serializedQuestions}`;
};

export default function HomePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<ChatMessage | null>(
    null
  );
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [isCurrentSaved, setIsCurrentSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [recent, setRecent] = useState<SavedQuiz[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const filteredQuizzes = useMemo(() => {
    const lower = filter.trim().toLowerCase();
    if (!lower) return recent;
    return recent.filter((item) => item.subject.toLowerCase().includes(lower));
  }, [filter, recent]);

  const showFeedback = (type: Feedback["type"], message: string) => {
    setFeedback({ type, message });
  };

  const clearFeedback = () => setFeedback(null);

  const feedbackTone: Record<Feedback["type"], string> = {
    success: "border-emerald-400/60 bg-emerald-500/10 text-emerald-100",
    error: "border-rose-500/60 bg-rose-500/10 text-rose-100",
    info: "border-white/30 bg-white/10 text-white/80",
  };

  const feedbackHeading: Record<Feedback["type"], string> = {
    success: "Success",
    error: "Something went wrong",
    info: "Heads up",
  };

  const handlePromptChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (feedback) clearFeedback();
    setPrompt(event.target.value);
  };

  const loadRecentQuizzes = async (user: string, limit = 30) => {
    const { data } = await supabase
      .from("quizzes")
      .select("id, subject, created_at, is_public, share_id")
      .eq("user_id", user)
      .order("created_at", { ascending: false })
      .limit(limit);
    setRecent(data || []);
  };

  const initializeUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("Error fetching user:", error.message);
      router.replace("/");
      setAuthChecked(true);
      return;
    }

    const user = data?.user;
    if (!user) {
      router.replace("/");
      setAuthChecked(true);
      return;
    }

    setUserId(user.id);
    const userName =
      (user.user_metadata as Record<string, string | undefined>)?.name ||
      user.email ||
      null;
    setDisplayName(userName);
    setAuthChecked(true);
    await loadRecentQuizzes(user.id);
  };

  useEffect(() => {
    initializeUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (feedback) clearFeedback();

    if (!prompt.trim()) {
      showFeedback("info", "Please enter a subject first.");
      return;
    }

    const trimmedPrompt = prompt.trim();
    setLoading(true);
    setActiveQuizId(null);
    setCurrentMessage(null);
    setAnswers({});
    setIsCurrentSaved(false);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");

      let parsed: QuizData | null;
      try {
        parsed =
          typeof data.result === "string"
            ? JSON.parse(data.result)
            : data.result;
      } catch (parseError) {
        console.error("Failed to parse quiz:", parseError);
        showFeedback(
          "error",
          "I couldn't understand the quiz data I received. Please try again."
        );
        return;
      }

      if (!parsed) {
        showFeedback(
          "info",
          `"${trimmedPrompt}" is not a valid quiz topic. Try a different subject.`
        );
        return;
      }

      const signature = computeQuizSignature(parsed);

      setCurrentMessage({
        role: "assistant",
        quiz: parsed,
        signature,
      });
      showFeedback("success", "Here is your freshly generated quiz—have fun!");
    } catch (err: any) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while generating your quiz.";
      showFeedback("error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex: number, optionLetter: string) => {
    setAnswers((prev) => {
      if (prev[questionIndex]) return prev;
      return { ...prev, [questionIndex]: optionLetter };
    });
  };

  const getOptionStyle = (
    questionIndex: number,
    optionLetter: string,
    correctAnswer: string
  ) => {
    const selected = answers[questionIndex];
    if (!selected) return "bg-gray-700 hover:bg-gray-600";
    if (optionLetter === correctAnswer) return "bg-green-600";
    if (optionLetter === selected && selected !== correctAnswer)
      return "bg-red-600";
    return "bg-gray-700 opacity-50";
  };

  const handleSaveQuiz = async () => {
    const quiz = currentMessage?.quiz;
    if (!quiz) return;

    if (feedback) clearFeedback();

    if (!userId) {
      showFeedback(
        "error",
        "I couldn't confirm your session—please log in again."
      );
      return;
    }

    if (isCurrentSaved) {
      showFeedback("info", "This quiz is already in your library.");
      return;
    }

    const signature =
      currentMessage?.signature ?? computeQuizSignature(currentMessage.quiz);

    setSaving(true);
    try {
      const { data: existing, error: dupError } = await supabase
        .from("quizzes")
        .select("id, subject, questions")
        .eq("user_id", userId)
        .eq("subject", quiz.subject);

      if (dupError) throw dupError;

      const alreadyExists = existing?.some((row) => {
        const existingQuiz: QuizData = {
          subject: row.subject,
          questions: row.questions as unknown as Question[],
        };
        return computeQuizSignature(existingQuiz) === signature;
      });

      if (alreadyExists) {
        showFeedback("info", "This quiz is already in your library.");
        setIsCurrentSaved(true);
        return;
      }

      const { error } = await supabase.from("quizzes").insert([
        {
          user_id: userId,
          subject: quiz.subject,
          questions: quiz.questions,
          is_public: false,
          share_id: null,
        },
      ]);

      if (error) throw error;
      await loadRecentQuizzes(userId);
      setIsCurrentSaved(true);
      showFeedback(
        "success",
        "Quiz saved successfully—find it anytime in your library."
      );
    } catch (err: any) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong while saving your quiz.";
      showFeedback("error", `Error saving quiz: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSavedQuiz = async (quiz: SavedQuiz) => {
    if (feedback) clearFeedback();
    setActiveQuizId(quiz.id);

    if (currentMessage?.savedQuizId === quiz.id) {
      setIsCurrentSaved(true);
      return;
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("subject, questions")
      .eq("id", quiz.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      showFeedback(
        "error",
        error.message || "Unable to load that quiz right now."
      );
      return;
    }

    if (data) {
      const loaded: QuizData = {
        subject: data.subject,
        questions: data.questions as Question[],
      };

      const signature = computeQuizSignature(loaded);

      setCurrentMessage({
        role: "assistant",
        quiz: loaded,
        savedQuizId: quiz.id,
        signature,
      });
      setAnswers({});
      setIsCurrentSaved(true);
      showFeedback("success", `Loaded "${loaded.subject}" from your library.`);
    }
  };

  const renderEmptyState = () => (
    <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl p-6 text-center text-white/70">
      <p className="text-lg font-medium">Start a conversation</p>
      <p className="mt-2 text-sm">
        Ask for a quiz topic above and I’ll craft a tailored multiple-choice
        quiz for you. You can save it, share it, or revisit it anytime from the
        sidebar.
      </p>
    </div>
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Checking your account...
      </div>
    );
  }

  const activeQuiz = currentMessage?.quiz || null;
  const totalQuestions = activeQuiz?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const score = activeQuiz
    ? activeQuiz.questions.reduce((acc, q, idx) => {
        return acc + (answers[idx] === q.answer ? 1 : 0);
      }, 0)
    : 0;

  return (
    <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 text-white p-4 md:p-6">
      <aside className="bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-4 h-full md:h-[82vh] overflow-y-auto border border-white/10">
        <div className="sticky top-0 pb-3 backdrop-blur rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your quizzes</h2>
            <button
              onClick={() => router.push("/profile")}
              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
            >
              Profile
            </button>
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search saved quizzes"
            className="mt-3 w-full text-sm px-3 py-2 rounded-lg bg-white/10 border border-white/10 placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {filteredQuizzes.length === 0 ? (
          <p className="text-white/60 text-sm">
            {recent.length === 0
              ? "No saved quizzes yet. Generate one and hit save."
              : "No quizzes match your search."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredQuizzes.map((quiz) => (
              <li
                key={quiz.id}
                className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                  activeQuizId === quiz.id
                    ? "border-amber-500/60 bg-amber-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                }`}
                onClick={() => handleLoadSavedQuiz(quiz)}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{quiz.subject}</p>
                    <p className="text-[11px] text-white/60">
                      {quiz.created_at
                        ? new Date(quiz.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`ml-auto text-[10px] px-2 py-1 rounded-full border ${
                      quiz.is_public
                        ? "border-emerald-500 text-emerald-300"
                        : "border-white/20 text-white/50"
                    }`}
                  >
                    {quiz.is_public ? "Public" : "Private"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-5">
          <div className="bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl p-4 shadow-sm flex flex-col items-center">
            <h1 className="text-3xl font-semibold text-amber-300 drop-shadow mb-3">
              {displayName ? `Welcome back, ${displayName}!` : "Welcome back!"}
            </h1>
            <p className="text-sm text-white/70 mb-4">
              Ask for any subject and I’ll craft a fresh multiple-choice quiz.
              You can answer it right here, save it for later, or share it from
              your profile.
            </p>
            <InputField
              label="What should we quiz you on today?"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="e.g. Neural networks, Renaissance art, photosynthesis"
            />
            <div className="flex justify-end">
              <GenerateButton
                text={loading ? "Generating..." : "Generate"}
                onClick={handleGenerate}
                disabled={loading}
              />
            </div>
          </div>

          {feedback && (
            <div
              className={`relative flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                feedbackTone[feedback.type]
              }`}
            >
              <div className="flex-1">
                <p className="font-semibold tracking-wide uppercase text-[11px] text-white/90">
                  {feedbackHeading[feedback.type]}
                </p>
                <p className="mt-1 text-sm leading-snug text-white">
                  {feedback.message}
                </p>
              </div>
              <button
                type="button"
                onClick={clearFeedback}
                className="text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          )}

          {!activeQuiz && renderEmptyState()}

          {activeQuiz && (
            <div className="flex justify-start">
              <div className="w-full bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <h2 className="text-2xl font-semibold text-amber-300">
                    {activeQuiz.subject}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>
                      {answeredCount}/{totalQuestions} answered
                    </span>
                    {allAnswered && (
                      <span className="px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-200">
                        Score: {score}
                      </span>
                    )}
                  </div>
                </div>

                {activeQuiz.questions.map((q, questionIndex) => (
                  <div key={questionIndex} className="mb-5">
                    <p className="font-semibold mb-2">
                      {questionIndex + 1}. {q.question}
                    </p>
                    <div className="flex flex-col gap-2">
                      {["A", "B", "C", "D"].map((letter, optionIndex) => (
                        <button
                          key={letter}
                          onClick={() =>
                            handleOptionSelect(questionIndex, letter)
                          }
                          disabled={!!answers[questionIndex]}
                          className={`text-left px-4 py-2 rounded-lg transition-all ${getOptionStyle(
                            questionIndex,
                            letter,
                            q.answer
                          )}`}
                        >
                          {letter}. {q.options[optionIndex]}
                        </button>
                      ))}
                    </div>
                    {answers[questionIndex] && (
                      <p className="mt-2 text-sm text-white/70">
                        Correct answer:{" "}
                        <span className="text-emerald-300 font-medium">
                          {q.answer}
                        </span>
                      </p>
                    )}
                  </div>
                ))}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleSaveQuiz}
                    disabled={saving || isCurrentSaved}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-sm font-semibold transition disabled:opacity-60"
                  >
                    {isCurrentSaved
                      ? "Saved"
                      : saving
                      ? "Saving..."
                      : "Save to library"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
