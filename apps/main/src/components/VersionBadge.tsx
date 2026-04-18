export function VersionBadge() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev";
  return (
    <p className="mt-8 mb-4 text-center text-[11px] text-gray-400">
      v{version} ({sha})
    </p>
  );
}
