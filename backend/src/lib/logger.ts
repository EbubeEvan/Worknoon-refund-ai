import { env } from "../config/env.js";

type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = ORDER[env.LOG_LEVEL];

function emit(level: Level, scope: string, message: string, extra?: unknown): void {
  if (ORDER[level] < threshold) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  if (extra === undefined) console.log(line);
  else console.log(line, extra);
}

export function createLogger(scope: string) {
  return {
    debug: (m: string, e?: unknown) => emit("debug", scope, m, e),
    info: (m: string, e?: unknown) => emit("info", scope, m, e),
    warn: (m: string, e?: unknown) => emit("warn", scope, m, e),
    error: (m: string, e?: unknown) => emit("error", scope, m, e),
  };
}

export type Logger = ReturnType<typeof createLogger>;
