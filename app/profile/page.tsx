"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type QuizRow = {
  id: string;
  subject: string;
  questions: { question: string; options: string[]; answer: string }[];
  created_at?: string;
  is_public?: boolean | null;
  share_id?: string | null;
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email ?? null);
      setName((user.user_metadata as any)?.name ?? null);

      const { data: rows, error } = await supabase
        .from("quizzes")
        .select("id, subject, questions, created_at, is_public, share_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && rows) setQuizzes(rows as any);
      setLoading(false);
    };
    run();
  }, []);

  if (loading) {
    return <div className="text-center text-white/80">Loading profile…</div>;
  }

  if (!email) {
    return (
      <div className="max-w-lg mx-auto bg-white/10 rounded-2xl p-6 text-white">
        <p className="mb-4">You're not signed in.</p>
        <Link
          href="/"
          className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg"
        >
          Go to Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white/10 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-semibold mb-2">Profile</h1>
        <p>
          <span className="text-white/70">Name:</span> {name ?? "—"}
        </p>
        <p>
          <span className="text-white/70">Email:</span> {email}
        </p>
      </div>

      <div className="bg-white/10 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-semibold mb-3">Saved Quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="text-white/70">No quizzes saved yet.</p>
        ) : (
          <ul className="space-y-3">
            {quizzes.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border border-white/10 p-4 bg-white/5"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{q.subject}</p>
                      <p className="text-sm text-white/70">
                        {q.questions?.length ?? 0} questions
                      </p>
                    </div>
                    {q.created_at && (
                      <span className="text-xs text-white/50">
                        {new Date(q.created_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="px-3 py-1.5 rounded-lg text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => {
                        const url = q.share_id
                          ? `${window.location.origin}/q/${q.share_id}`
                          : null;
                        if (!url) return;
                        navigator.clipboard.writeText(url);
                      }}
                      disabled={!q.share_id}
                      title={
                        q.share_id ? "Copy public link" : "Make public first"
                      }
                    >
                      Copy link
                    </button>

                    <button
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        q.is_public
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-white/10 hover:bg-white/20 text-white"
                      }`}
                      onClick={async () => {
                        // Toggle public
                        const next = !q.is_public;
                        let share_id = q.share_id;
                        if (next && !share_id) {
                          // generate a short id
                          share_id =
                            typeof crypto !== "undefined" &&
                            "randomUUID" in crypto
                              ? crypto.randomUUID()
                              : Math.random().toString(36).slice(2, 10);
                        }
                        const { error } = await supabase
                          .from("quizzes")
                          .update({ is_public: next, share_id })
                          .eq("id", q.id);
                        if (!error) {
                          setQuizzes((prev) =>
                            prev.map((it) =>
                              it.id === q.id
                                ? { ...it, is_public: next, share_id }
                                : it
                            )
                          );
                        }
                      }}
                    >
                      {q.is_public ? "Make private" : "Make public"}
                    </button>

                    <button
                      className="px-3 py-1.5 rounded-lg text-sm bg-red-500 hover:bg-red-600 text-white ml-auto"
                      onClick={async () => {
                        if (!confirm("Delete this quiz?")) return;
                        const { error } = await supabase
                          .from("quizzes")
                          .delete()
                          .eq("id", q.id);
                        if (!error) {
                          setQuizzes((prev) =>
                            prev.filter((it) => it.id !== q.id)
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  {q.is_public && q.share_id && (
                    <p className="text-xs text-white/60">
                      Public URL:{" "}
                      <a
                        className="underline"
                        href={`/q/${q.share_id}`}
                        target="_blank"
                      >
                        /q/{q.share_id}
                      </a>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
