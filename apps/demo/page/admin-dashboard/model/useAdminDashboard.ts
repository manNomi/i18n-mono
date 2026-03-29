"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useTranslation } from "i18nexus";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/features/auth-login";
import { approveProject, deleteProject } from "@/features/project-manage";
import { auth } from "@/shared/lib";
import { useError } from "@/shared/ui";

interface Submission {
  id: string;
  url: string;
  projectName: string | null;
  autoTitle: string;
  autoDescription: string;
  thumbnailUrl: string;
  screenshotUrl?: string | null;
  contactEmail: string | null;
  approved: boolean;
  submittedAt: { seconds: number };
}

type Filter = "pending" | "approved" | "all";

export function useAdminDashboard() {
  const { t } = useTranslation("admin-dashboard");
  const { setError } = useError();
  const [user, setUser] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const router = useRouter();

  useEffect(() => {
    // Check if Firebase is configured
    if (!auth) {
      setLoading(false);
      router.push("/admin/login");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        router.push("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchSubmissions = async () => {
    try {
      const approvedParam =
        filter === "pending" ? "false" : filter === "approved" ? "true" : "";
      const url =
        filter === "all"
          ? "/api/submissions"
          : `/api/submissions?approved=${approvedParam}`;

      const response = await fetch(url);
      const data = await response.json();

      // 배열 검증: API가 에러 객체를 반환할 수 있음
      if (Array.isArray(data)) {
        setSubmissions(data);
      } else {
        console.error("API returned non-array data:", data);
        setSubmissions([]);

        // 에러 메시지 표시
        if (data.code === "FIRESTORE_INDEX_REQUIRED") {
          // 인덱스 생성 링크가 있으면 표시
          const message = data.indexUrl
            ? t(
                "Firestore \uC778\uB371\uC2A4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4. \uB9C1\uD06C\uB97C \uD074\uB9AD\uD558\uC5EC \uC0DD\uC131\uD574\uC8FC\uC138\uC694: {{\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\ndata_indexUrl}}",
                {
                  data_indexUrl: data.indexUrl,
                },
              )
            : data.error;
          setError(message);

          // 콘솔에도 링크 출력
          if (data.indexUrl) {
            console.log(t("🔗 Firestore 인덱스 생성 링크:"), data.indexUrl);
          }
        } else if (data.code === "FIRESTORE_NOT_CONFIGURED") {
          setError(
            t(
              "Firestore Database가 설정되지 않았습니다. FIREBASE_QUICK_SETUP.md를 참고하세요.",
            ),
          );
        } else {
          setError(data.error || t("제출 목록을 불러오는데 실패했습니다."));
        }
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
      setSubmissions([]);
      setError(t("제출 목록을 불러오는데 실패했습니다."));
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const handleApprove = async (id: string) => {
    try {
      await approveProject(id);
      fetchSubmissions();
    } catch (error) {
      console.error("Failed to approve:", error);
      setError(t("승인 중 오류가 발생했습니다."));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("정말 삭제하시겠습니까?"))) return;

    try {
      await deleteProject(id);
      fetchSubmissions();
    } catch (error) {
      console.error("Failed to delete:", error);
      setError(t("삭제 중 오류가 발생했습니다."));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return {
    user,
    loading,
    submissions,
    filter,
    setFilter,
    handleApprove,
    handleDelete,
    handleLogout,
  };
}
