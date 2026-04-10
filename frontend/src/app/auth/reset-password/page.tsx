"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stethoscope, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Missing reset token. Please request a new reset link.");
  }, [token]);

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 8) return { label: "Too short", color: "bg-red-400", width: "25%" };
    if (pwd.length < 10 && !/[^a-zA-Z0-9]/.test(pwd)) return { label: "Weak", color: "bg-amber-400", width: "50%" };
    if (pwd.length >= 10 && /[^a-zA-Z0-9]/.test(pwd)) return { label: "Strong", color: "bg-green-500", width: "100%" };
    return { label: "Fair", color: "bg-blue-400", width: "75%" };
  };

  const strength = passwordStrength(newPassword);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { token, newPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-xl text-slate-900">SoloDoc</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        {success ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Password updated!</h1>
            <p className="text-slate-500 text-sm mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="w-full btn-primary"
            >
              Go to login
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
              <Lock className="w-6 h-6 text-brand-600" />
            </div>

            <h1 className="text-xl font-bold text-slate-900 mb-1">Set a new password</h1>
            <p className="text-sm text-slate-500 mb-6">
              Choose a strong password you have not used before.
            </p>

            {!token && (
              <div className="flex items-start gap-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Invalid reset link</p>
                  <p className="text-xs mt-0.5">
                    Please{" "}
                    <button
                      onClick={() => router.push("/auth/forgot-password")}
                      className="underline font-medium"
                    >
                      request a new link
                    </button>
                    .
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="input w-full pr-10"
                    required
                    disabled={!token}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {strength && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${strength.color}`}
                        style={{ width: strength.width }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${
                      strength.label === "Strong" ? "text-green-600" :
                      strength.label === "Fair" ? "text-blue-500" :
                      strength.label === "Weak" ? "text-amber-500" : "text-red-500"
                    }`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirm new password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`input w-full ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "border-red-300 focus:ring-red-200"
                      : ""
                  }`}
                  required
                  disabled={!token}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p>{error}</p>
                    {error.toLowerCase().includes("expired") && (
                      <button
                        type="button"
                        onClick={() => router.push("/auth/forgot-password")}
                        className="text-xs underline font-medium mt-1"
                      >
                        Request a new reset link
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token || !newPassword || !confirmPassword}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
