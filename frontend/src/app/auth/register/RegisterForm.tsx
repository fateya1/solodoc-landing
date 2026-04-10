"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Stethoscope, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

const schema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["PATIENT", "DOCTOR"]),
});
type FormData = z.infer<typeof schema>;

export default function RegisterForm() {
  const t = useT();
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const defaultRole = (searchParams.get("role") as "PATIENT" | "DOCTOR") ?? "PATIENT";

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const role = watch("role");

  const onSubmit = async (data: FormData) => {
    setError("");
    try {
      await apiClient.post("/auth/register", data);
      const loginRes = await apiClient.post("/auth/login", { email: data.email, password: data.password });
      setAuth(loginRes.data.accessToken, loginRes.data.user);
      router.push(data.role === "DOCTOR" ? "/dashboard/doctor" : "/dashboard/patient");
    } catch (err: any) {
      setError(err.response?.data?.message?.[0] || err.response?.data?.message || t("common", "errorGeneric"));
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
          <h1 className="font-display text-3xl font-bold text-slate-900">{t("auth", "createAccount")}</h1>
          <p className="text-slate-500 mt-2">{t("auth", "createAccountSubtitle")}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {(["PATIENT", "DOCTOR"] as const).map((r) => (
                <label key={r} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  role === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                  <input {...register("role")} type="radio" value={r} className="hidden" />
                  <span className="font-medium text-sm">
                    {r === "PATIENT" ? `🧑 ${t("auth", "patient")}` : `👨‍⚕️ ${t("auth", "doctor")}`}
                  </span>
                </label>
              ))}
            </div>

            <div>
              <label className="label">{t("auth", "fullName")}</label>
              <input {...register("fullName")} placeholder={t("auth", "fullNamePlaceholder")} className="input" />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="label">{t("auth", "emailAddress")}</label>
              <input {...register("email")} type="email" placeholder={t("auth", "emailPlaceholder")} className="input" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">{t("auth", "password")}</label>
              <input {...register("password")} type="password" placeholder={t("auth", "passwordPlaceholder")} className="input" />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? t("auth", "creatingAccount") : t("auth", "createAccount")}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {t("auth", "alreadyHaveAccount")}{" "}
            <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">{t("common", "signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
