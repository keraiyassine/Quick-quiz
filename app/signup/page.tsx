"use client";
import AuthPage from "../page";
import { useEffect } from "react";

export default function SignUpRoute() {
  // Ensure the default mode inside AuthPage is signup when hitting /signup
  // by setting a hash the component can read, or you can extend AuthPage later.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.hash = "#signup";
    }
  }, []);

  return <AuthPage />;
}
