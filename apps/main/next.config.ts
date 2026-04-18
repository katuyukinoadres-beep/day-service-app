import type { NextConfig } from "next";
import { readFileSync } from "fs";
import { resolve } from "path";

const rootPkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../package.json"), "utf-8")
) as { version: string };

const nextConfig: NextConfig = {
  transpilePackages: ["@patto/shared"],
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
    NEXT_PUBLIC_COMMIT_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  },
};

export default nextConfig;
