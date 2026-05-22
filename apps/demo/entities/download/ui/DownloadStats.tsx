"use client";

import { useTranslation } from "i18nexus";
import { useEffect, useState } from "react";

import type { DownloadStats as DownloadStatsType } from "@/shared/lib";

interface DownloadStatsProps {
  packageName: string;
  displayName: string;
  color: "blue" | "indigo" | "purple";
}

const colorClasses = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
  },
};

export default function DownloadStats({
  packageName,
  displayName,
  color,
}: DownloadStatsProps) {
  const { t } = useTranslation<"common">("common");
  const [stats, setStats] = useState<DownloadStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`/api/downloads?package=${packageName}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [packageName]);

  const colors = colorClasses[color];

  if (loading) {
    return (
      <div className={`rounded-lg border bg-white ${colors.border} p-5`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${colors.text}`}>
              {displayName}
            </p>
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{t("Loading...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">{displayName}</p>
            <p className="mt-2 text-2xl font-bold text-slate-400">--</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-red-700">{t("Failed to load")}</p>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className={`rounded-lg border bg-white ${colors.border} p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${colors.text}`}>{displayName}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {stats ? formatNumber(stats.downloads) : "0"}
          </p>
        </div>
        <div
          className={`rounded-md ${colors.bg} px-3 py-2 text-xs font-semibold ${colors.text}`}
        >
          npm
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{t("Total downloads")}</p>
    </div>
  );
}
