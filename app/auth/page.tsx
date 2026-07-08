"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Crown, LogIn, UserPlus } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useI18n } from "@/components/i18n-provider";
import AppMenu from "@/components/app-menu";

export default function AuthPage() {
  const { t, language } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      const cleanUsername = username.trim();
      if (cleanUsername.length < 2 || cleanUsername.length > 40) {
        setError(t("usernameLength"));
        setLoading(false);
        return;
      }
      const availabilityResponse = await fetch(`/api/usernames?username=${encodeURIComponent(cleanUsername)}`, { cache: "no-store" });
      const availability = await availabilityResponse.json();
      if (!availabilityResponse.ok) {
        setError(t("usernameCheckFailed"));
        setLoading(false);
        return;
      }
      if (!availability.available) {
        setError(t("usernameTaken"));
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next)}`, data: { language, username: cleanUsername, display_name: cleanUsername } } });
      if (error) setError(error.message.includes("username") || error.message.includes("Database error saving new user") ? t("usernameTaken") : translate(error.message, language));
      else if (data.session) window.location.href = next;
      else setMessage(t("confirmEmail"));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(translate(error.message, language));
      else window.location.href = next;
    }
    setLoading(false);
  }

  return <main className="shell auth-shell">
    <div className="topbar"><a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a><AppMenu /></div>
    <section className="card auth-card">
      <a className="back-link" href="/"><ArrowLeft size={15} /> {t("back")}</a>
      <p className="eyebrow">{mode === "login" ? t("welcomeBack") : t("joinGame")}</p>
      <h2>{mode === "login" ? t("signIn") : t("createAccount")}</h2>
      <form onSubmit={submit}>
        {mode === "signup" && <div className="field"><label htmlFor="username">{t("username")}</label><input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} maxLength={40} autoComplete="username" /><small>{t("usernameHelp")}</small></div>}
        <div className="field"><label htmlFor="email">{t("email")}</label><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div className="field"><label htmlFor="password">{t("password")}</label><input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} /></div>
        {error && <div className="notice error">{error}</div>}{message && <div className="notice">{message}</div>}
        <button className="btn btn-primary" disabled={loading}>{mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />} {loading ? t("working") : mode === "login" ? t("signIn") : t("registering")}</button>
      </form>
      <button className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? t("noAccount") : t("hasAccount")}</button>
    </section>
  </main>;
}

function translate(message: string, language: "es" | "en" = "es") {
  if (message.includes("Invalid login")) return language === "en" ? "Incorrect email or password." : "Email o contraseña incorrectos.";
  if (message.includes("already registered")) return language === "en" ? "An account already exists with this email." : "Ya existe una cuenta con este email.";
  if (message.includes("Password should")) return language === "en" ? "The password must have at least 6 characters." : "La contraseña debe tener al menos 6 caracteres.";
  return message;
}
