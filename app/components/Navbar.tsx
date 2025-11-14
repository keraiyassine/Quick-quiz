"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load current user
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    // Listen for auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <header className="w-full sticky top-0 z-30 bg-gradient-to-b from-gray-900/90 to-gray-900/70 backdrop-blur border-b border-white/10">
      <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-amber-400 font-semibold text-lg">
          AI Quiz
        </Link>
        <div className="flex items-center gap-4">
          {email && (
            <>
              <Link
                href="/home"
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                href="/profile"
                className="text-sm text-white/80 hover:text-white transition-colors"
              >
                Profile
              </Link>
            </>
          )}
          {email ? (
            <button
              onClick={handleSignOut}
              className="text-sm px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
