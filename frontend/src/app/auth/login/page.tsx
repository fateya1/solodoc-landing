"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Stethoscope, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const t = useT();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      const res = await apiClient.post("/auth/login", data);
      const { accessToken, user } = res.data;
      setAuth(accessToken, user);
      await new Promise((resolve) => setTimeout(resolve, 50));
      const role = user.role;
      if (role === "DOCTOR") {
        try {
          const status = await apiClient.get("/onboarding/status");
          if (!status.data.isComplete) { router.replace("/onboarding"); return; }
        } catch {}
        router.replace("/dashboard/doctor");
      } else if (role === "PATIENT") {
        router.replace("/dashboard/patient");
      } else if (role === "ADMIN") {
        router.replace("/dashboard/admin");
      } else {
        router.replace("/");
      }
    } catch (err: any) {
      const message = err.response?.data?.message || t("auth", "invalidCredentials");
      setError(Array.isArray(message) ? message[0] : message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-2xl mb-4">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">{t("auth", "welcomeBack")}</h1>
          <p className="text-slate-500 mt-2">{t("auth", "signInSubtitle")}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="label">{t("auth", "emailAddress")}</label>
              <input {...register("email")} type="email" placeholder={t("auth", "emailPlaceholder")} className="input" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">{t("auth", "password")}</label>
              <div className="relative">
                <input {...register("password")} type={showPassword ? "text" : "password"}
                  placeholder={t("auth", "passwordPlaceholder")} className="input pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? t("auth", "signingIn") : t("common", "signIn")}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            {t("auth", "noAccount")}{" "}
            <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">{t("common", "signUp")}</Link>
          </p>
          <p className="text-center text-sm text-slate-500 mt-2">
            <Link href="/auth/forgot-password" className="text-brand-600 font-medium hover:underline">
              {t("auth", "forgotPassword")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
