"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white/60">
      Redirecting to your home workspace...
    </div>
  );
}
