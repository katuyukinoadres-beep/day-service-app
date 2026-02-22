"use client";

type BadgeStatus = "active" | "inactive" | "admin" | "staff" | "super_admin";

interface StatusBadgeProps {
  status: BadgeStatus;
}

const badgeStyles: Record<BadgeStatus, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-800", label: "有効" },
  inactive: { bg: "bg-gray-100", text: "text-gray-800", label: "無効" },
  admin: { bg: "bg-blue-100", text: "text-blue-800", label: "管理者" },
  staff: { bg: "bg-yellow-100", text: "text-yellow-800", label: "スタッフ" },
  super_admin: { bg: "bg-purple-100", text: "text-purple-800", label: "スーパー管理者" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = badgeStyles[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
