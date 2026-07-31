// vite-env.d.ts
/// <reference types="vite/client" />

// Solo lo que el frontend realmente consume. No declarar aqui claves de Supabase ni de
// Gemini: el frontend no habla con ninguno de los dos, todo pasa por la API.
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SUPPORT_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
