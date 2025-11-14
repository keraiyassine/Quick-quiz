"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, signUp, getCurrentUser } from "./Logic/auth";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    // If already signed in, go to home
    getCurrentUser().then((user) => {
      if (user) {
        router.replace("/home");
      }
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(email, password, name || undefined);
        // Inform the user to activate their account via email,
        // then send them to the sign-in view.
        setInfo(
          "Account created. Please check your email to activate your account, then sign in."
        );
        setMode("signin");
        setPassword("");
      } else {
        await signIn(email, password);
      }
      const user = await getCurrentUser();
      if (user) {
        router.push("/home");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center">
      <div className="w-full max-w-md bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setMode("signin")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === "signin"
                ? "bg-emerald-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              mode === "signup"
                ? "bg-emerald-500 text-white"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {mode === "signup" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-white/90">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Your name"
                className="w-full p-3 bg-amber-100 text-gray-900 rounded-xl outline-none shadow-md focus:ring-4 focus:ring-amber-400"
                name="name"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-white/90">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="w-full p-3 bg-amber-100 text-gray-900 rounded-xl outline-none shadow-md focus:ring-4 focus:ring-amber-400"
              name="email"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-white/90">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-amber-100 text-gray-900 rounded-xl outline-none shadow-md focus:ring-4 focus:ring-amber-400"
              name="password"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm mt-1" role="alert">
              {error}
            </p>
          )}

          {info && !error && (
            <p className="text-emerald-300 text-sm mt-1" role="status">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create account"
              : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
