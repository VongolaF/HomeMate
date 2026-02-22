import type { NextConfig } from "next";

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

type AppEnv = "dev" | "int" | "prod";

const resolveAppEnv = (): AppEnv => {
  const explicit = process.env.APP_ENV ?? process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit === "dev" || explicit === "int" || explicit === "prod") return explicit;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production") return "prod";
  if (vercelEnv === "preview") return "int";
  return "dev";
};

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return;
  dotenv.config({ path: filePath, override: false });
};

const loadAppEnvFiles = () => {
  const appEnv = resolveAppEnv();

  if (!process.env.APP_ENV) process.env.APP_ENV = appEnv;
  if (!process.env.NEXT_PUBLIC_APP_ENV) process.env.NEXT_PUBLIC_APP_ENV = appEnv;

  const cwd = process.cwd();
  const candidates: string[] = [];

  if (appEnv === "dev") {
    // Preferred local naming for this repo.
    // Next.js also loads .env.development(.local) and .env.local automatically in dev.
    candidates.push(
      ".env.dev.local",
      ".env.dev",
      ".env.development.local",
      ".env.development",
      ".env.local",
      ".env"
    );
  } else if (appEnv === "int") {
    // Custom integration environment (typically mapped from Vercel Preview).
    candidates.push(".env.int.local", ".env.int");
  } else {
    // Production environment (typically mapped from Vercel Production).
    candidates.push(
      ".env.prod.local",
      ".env.prod",
      ".env.production.local",
      ".env.production"
    );
  }

  candidates.map((name) => path.resolve(cwd, name)).forEach(loadEnvFile);
};

loadAppEnvFiles();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
