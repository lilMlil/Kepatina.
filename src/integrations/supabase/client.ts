import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Connection settings come from .env (see .env.example). Only the PUBLISHABLE key
// belongs in the app — never put the secret key here.
const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

export const supabaseConfigured = Boolean(url && key && !url.includes("YOUR-PROJECT"));

export const supabase = createClient<Database>(
  supabaseConfigured ? url! : "https://not-configured.invalid",
  supabaseConfigured ? key! : "not-configured",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The app is not a website: there are no auth links to parse from the address bar.
      detectSessionInUrl: false,
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
    },
  },
);
