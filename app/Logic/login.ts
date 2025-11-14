import { supabase } from "@/lib/supabaseClient";

export default async function login(name: string, password: string) {
  const { error } = await supabase
    .from("Users")
    .insert([{ name, password }]);

  if (error) {
    console.error("Supabase insert error:", error.message);
  }
}
