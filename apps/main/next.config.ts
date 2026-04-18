import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const rootPkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../package.json"), "utf-8")
) as { version: string };

function getCommitSha(): string {
  // Vercel が Git 連携でビルドするときにセットする環境変数を最優先
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) {
    return vercelSha.slice(0, 7);
  }
  // ローカル or Vercel CLI デプロイ時は git HEAD を直接読む
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "dev";
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@patto/shared"],
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
};

export default nextConfig;
