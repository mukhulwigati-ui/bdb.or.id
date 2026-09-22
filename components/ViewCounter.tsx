// components/ViewCounter.tsx

"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

type ViewCounterProps = {
  type: "news" | "campaign";
  slug: string;
  className?: string;
};

export default function ViewCounter({
  type,
  slug,
  className = "",
}: ViewCounterProps) {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;

    const storageKey = `bdb-viewed:${type}:${slug}`;

    async function getCurrentViews() {
      const res = await fetch(
        `/api/views?type=${encodeURIComponent(
          type
        )}&slug=${encodeURIComponent(slug)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error("Gagal mengambil jumlah pembaca");
      }

      const json = await res.json();

      if (!cancelled) {
        setViews(Number(json.views ?? 0));
      }
    }

    async function loadViews() {
      try {
        const alreadyViewed =
          typeof window !== "undefined" &&
          sessionStorage.getItem(storageKey) === "1";

        // =====================================================
        // SUDAH DIBACA DALAM SESSION INI
        // HANYA AMBIL JUMLAH
        // =====================================================

        if (alreadyViewed) {
          await getCurrentViews();
          return;
        }

        // =====================================================
        // BELUM DIBACA
        // TAMBAHKAN 1 VIEW
        // =====================================================

        const res = await fetch("/api/views", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          cache: "no-store",

          body: JSON.stringify({
            type,
            slug,
          }),
        });

        if (!res.ok) {
          throw new Error("Gagal menambahkan jumlah pembaca");
        }

        const json = await res.json();

        if (json.counted === true) {
          try {
            sessionStorage.setItem(storageKey, "1");
          } catch {
            // Abaikan jika browser menolak sessionStorage
          }
        }

        if (!cancelled) {
          setViews(Number(json.views ?? 0));
        }
      } catch (error) {
        console.error("VIEW COUNTER ERROR:", error);

        try {
          await getCurrentViews();
        } catch (fallbackError) {
          console.error(
            "VIEW COUNTER FALLBACK ERROR:",
            fallbackError
          );
        }
      }
    }

    loadViews();

    return () => {
      cancelled = true;
    };
  }, [type, slug]);

  if (views === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs text-slate-400 ${className}`}
      >
        <Eye size={14} />
        <span>...</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`}
      title={`${views.toLocaleString("id-ID")} kali dibaca`}
    >
      <Eye size={14} />

      <span>
        {views.toLocaleString("id-ID")} dibaca
      </span>
    </span>
  );
}