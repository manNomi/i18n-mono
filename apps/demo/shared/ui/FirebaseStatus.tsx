"use client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { useTranslation } from "i18nexus";
import { useEffect, useState } from "react";

import { auth, db } from "@/shared/lib/firebase";

export default function FirebaseStatus() {
  const { t } = useTranslation<"common">("common");
  const [status, setStatus] = useState<{
    auth: boolean;
    firestore: boolean;
    user: string | null;
  }>({
    auth: false,
    firestore: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFirebase = async () => {
      try {
        // Check if Firebase is configured
        if (!auth || !db) {
          setStatus({
            auth: false,
            firestore: false,
            user: null,
          });
          setLoading(false);
          return;
        }

        // Check Auth
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setStatus((prev) => ({
            ...prev,
            auth: true,
            user: user?.email || null,
          }));
        });

        // Check Firestore
        try {
          const q = query(collection(db, "submissions"), limit(1));
          await getDocs(q);
          setStatus((prev) => ({ ...prev, firestore: true }));
        } catch (error) {
          console.warn("Firestore not accessible yet:", error);
          setStatus((prev) => ({ ...prev, firestore: false }));
        }

        setLoading(false);
        return () => unsubscribe();
      } catch (error) {
        console.error("Firebase check error:", error);
        setLoading(false);
      }
    };

    checkFirebase();
  }, []);

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700 sm:block">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-slate-500" />
          <span className="text-sm">{t("Firebase 연결 확인 중...")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 hidden rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-700 sm:block">
      <div className="mb-2 text-xs font-semibold">Firebase Status</div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between space-x-4">
          <span>Authentication:</span>
          <span className={status.auth ? "text-green-700" : "text-red-700"}>
            {status.auth ? "Connected" : "Failed"}
          </span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span>Firestore:</span>
          <span
            className={status.firestore ? "text-green-700" : "text-amber-700"}
          >
            {status.firestore ? "Connected" : "Setup Needed"}
          </span>
        </div>
        {status.user && (
          <div className="mt-2 border-t border-slate-200 pt-2">
            <span className="text-slate-500">Logged in: </span>
            <span className="text-blue-700">{status.user}</span>
          </div>
        )}
      </div>
    </div>
  );
}
