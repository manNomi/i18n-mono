"use client";

import { useTranslation } from "i18nexus";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signIn } from "@/features/auth-login/api/signIn";
import { useError } from "@/shared/ui";

export default function LoginForm() {
  const { t } = useTranslation<"common">("common");
  const { setError: showError } = useError();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      console.error("Login error:", err);

      let errorMessage = t("로그인에 실패했습니다.");

      // Firebase 에러 코드별 메시지
      const firebaseError = err as { code?: string; message?: string };

      if (firebaseError.code === "auth/invalid-credential") {
        errorMessage = t("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (firebaseError.code === "auth/user-not-found") {
        errorMessage = t("등록되지 않은 이메일입니다.");
      } else if (firebaseError.code === "auth/wrong-password") {
        errorMessage = t("비밀번호가 올바르지 않습니다.");
      } else if (firebaseError.code === "auth/too-many-requests") {
        errorMessage = t(
          "너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요."
        );
      } else if (firebaseError.code === "auth/network-request-failed") {
        errorMessage = t(
          "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요."
        );
      } else if (
        firebaseError.code === "auth/configuration-not-found" ||
        firebaseError.message?.includes("auth/invalid-api-key")
      ) {
        errorMessage = t(
          "Firebase Authentication이 올바르게 설정되지 않았습니다. Firebase Console에서 Authentication을 활성화해주세요."
        );
      }

      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full">
      {/* Header */}
      <h1 className="mb-2 text-center text-3xl font-bold text-slate-950">
        {t("관리자 로그인")}
      </h1>
      <p className="mb-6 text-center text-sm text-slate-600">
        {t("Showcase 관리 대시보드에 접근하려면 로그인하세요")}
      </p>

      {/* Form */}
      <form
        onSubmit={handleLogin}
        className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {t("이메일")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {t("비밀번호")}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border border-blue-600 bg-blue-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
        >
          {loading ? t("로그인 중...") : t("로그인")}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-950">
          {t("Firebase 설정이 필요하신가요?")}
        </h3>
        <ol className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start">
            <span className="mr-2 text-slate-400">1.</span>
            <span>
              <a
                href="https://console.firebase.google.com/u/0/project/i18nexus/authentication/users"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline hover:text-blue-900"
              >
                Firebase Console
              </a>
              {t("에서 Authentication 활성화")}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-slate-400">2.</span>
            <span>{t('Sign-in method에서 "Email/Password" 활성화')}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-slate-400">3.</span>
            <span>{t("Users 탭에서 관리자 계정 추가")}</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-slate-400">4.</span>
            <span>
              {t("Firestore Database도 생성 필요 (규칙: 테스트 모드)")}
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
