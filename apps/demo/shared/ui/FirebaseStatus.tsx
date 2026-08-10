"use client";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { useEffect, useState } from "react";

import { auth, db } from "@/shared/lib/firebase";

export default function FirebaseStatus() {
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
    const firebaseAuth = auth;
    const firestore = db;

    // Do not expose Firebase diagnostics to public visitors.
    if (!firebaseAuth || !firestore) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setStatus({
          auth: false,
          firestore: false,
          user: null,
        });
        setLoading(false);
        return;
      }

      setStatus({
        auth: true,
        firestore: false,
        user: user.email || null,
      });

      try {
        const q = query(collection(firestore, "submissions"), limit(1));
        await getDocs(q);
        setStatus((prev) => ({ ...prev, firestore: true }));
      } catch (error) {
        console.warn("Firestore not accessible yet:", error);
        setStatus((prev) => ({ ...prev, firestore: false }));
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading || !status.user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 hidden rounded-lg border border-white/10 bg-[#171717]/95 px-4 py-3 text-zinc-300 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur sm:block">
      <div className="mb-2 text-xs font-semibold text-zinc-100">
        Firebase Status
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between space-x-4">
          <span>Authentication:</span>
          <span className={status.auth ? "text-blue-300" : "text-zinc-400"}>
            {status.auth ? "Connected" : "Failed"}
          </span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span>Firestore:</span>
          <span
            className={status.firestore ? "text-blue-300" : "text-zinc-400"}
          >
            {status.firestore ? "Connected" : "Setup Needed"}
          </span>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2">
          <span className="text-zinc-500">Logged in: </span>
          <span className="text-blue-300">{status.user}</span>
        </div>
      </div>
    </div>
  );
}
