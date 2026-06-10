"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface ErrorContextType {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export function GlobalErrorProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  return (
    <ErrorContext.Provider value={{ error, setError, clearError }}>
      {children}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border border-white/10 bg-[#171717]/95 px-5 py-4 text-zinc-100 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur md:left-auto md:right-4 md:w-96">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div>
                <h3 className="mb-1 font-semibold">Error</h3>
                <p className="text-sm text-zinc-300">{error}</p>
              </div>
            </div>
            <button
              onClick={clearError}
              className="ml-4 text-zinc-400 hover:text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within a GlobalErrorProvider");
  }
  return context;
}
