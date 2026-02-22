import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Card } from "@/components/ui/Card";

const ChevronIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#6B7280"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const items = [
  {
    href: "/documents/daily-log",
    icon: "📋",
    bg: "bg-primary",
    label: "業務日誌",
    desc: "施設全体の日次記録",
  },
  {
    href: "/documents/service-record",
    icon: "📝",
    bg: "bg-accent",
    label: "サービス提供記録",
    desc: "児童別の支援記録",
  },
  {
    href: "/documents/monthly-summary",
    icon: "📊",
    bg: "bg-[#3B82F6]",
    label: "月次出席サマリー",
    desc: "月間の出席一覧表",
  },
];

export default function DocumentsPage() {
  return (
    <div>
      <Header title="帳票" />

      <div className="flex flex-col gap-3 px-4 py-4">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="flex items-center gap-3 active:bg-gray-50 transition-colors">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${item.bg} text-white text-[18px] shrink-0`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground">
                  {item.label}
                </p>
                <p className="text-[13px] text-sub">{item.desc}</p>
              </div>
              <ChevronIcon />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
