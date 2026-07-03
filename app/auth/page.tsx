"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Crown, LogIn, UserPlus } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") setMode("signup");
    getSupabaseBrowser().auth.getSession().then(({ data }) => { if (data.session) window.location.href = params.get("next") || "/"; });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const supabase = getSupabaseBrowser();
    const next = new URLSearchParams(window.location.search).get("next") || "/";
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}` } });
      if (error) setError(translate(error.message));
      else if (data.session) window.location.href = next;
      else setMessage("Revisa tu correo y confirma la cuenta para poder entrar.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(translate(error.message));
      else window.location.href = next;
    }
    setLoading(false);
  }

  return <main className="shell auth-shell">
    <a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a>
    <section className="card auth-card">
      <a className="back-link" href="/"><ArrowLeft size={15} /> Volver</a>
      <p className="eyebrow">{mode === "login" ? "Bienvenida de nuevo" : "Únete al juego"}</p>
      <h2>{mode === "login" ? "Iniciar sesión" : "Crear cuenta"}</h2>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div className="field"><label htmlFor="password">Contraseña</label><input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
        {error && <div className="notice error">{error}</div>}{message && <div className="notice">{message}</div>}
        <button className="btn btn-primary" disabled={loading}>{mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />} {loading ? "Un momento…" : mode === "login" ? "Entrar" : "Registrarme"}</button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}</button>
    </section>
  </main>;
}

function translate(message: string) {
  if (message.includes("Invalid login")) return "Email o contraseña incorrectos.";
  if (message.includes("already registered")) return "Ya existe una cuenta con este email.";
  if (message.includes("Password should")) return "La contraseña debe tener al menos 6 caracteres.";
  return message;
}
