"use client";

import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function Header({ title, showBack = false, right }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => router.back()}
            className="tap-target flex items-center justify-center rounded-lg p-1 hover:bg-gray-100"
            aria-label="戻る"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 className="text-[18px] font-bold text-foreground">{title}</h1>
      </div>
      {right && <div>{right}</div>}
    </header>
  );
}
