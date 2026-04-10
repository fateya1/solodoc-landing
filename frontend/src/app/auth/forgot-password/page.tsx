"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function ForgotPasswordPage() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      await apiClient.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t("common", "errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md flex justify-end mb-2">
        <LanguageSwitcher />
      </div>

      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl text-slate-900">{t("common", "appName")}</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">{t("auth", "checkInbox")}</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {t("auth", "checkInboxSubtitle").replace("{email}", email)}
            </p>
            <p className="text-xs text-slate-400 mb-6">
              {t("auth", "didntGetEmail")}{" "}
              <button onClick={() => setSent(false)} className="text-brand-600 hover:underline font-medium">
                {t("auth", "tryAgain")}
              </button>.
            </p>
            <button onClick={() => router.push("/auth/login")} className="w-full btn-primary">
              {t("auth", "backToLogin")}
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => router.push("/auth/login")}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t("auth", "backToLogin")}
            </button>
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
              <Mail className="w-6 h-6 text-brand-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{t("auth", "forgotPasswordTitle")}</h1>
            <p className="text-sm text-slate-500 mb-6">{t("auth", "forgotPasswordSubtitle")}</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t("auth", "emailAddress")}
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth", "emailPlaceholder")} className="input w-full" required autoFocus />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
              )}
              <button type="submit" disabled={loading || !email.trim()}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? t("auth", "sending") : t("auth", "sendResetLink")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
