const SECRET_KEY = /(token|secret|password|cookie|authorization|credential|prompt|reasoning|rawpayload|environment)/i;
const REDACTED = "[REDACTED]";

export function redactForMonitor<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactForMonitor(item)) as T;
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (SECRET_KEY.test(key)) result[key] = REDACTED;
      else result[key] = redactForMonitor(item);
    }
    return result as T;
  }
  if (typeof value === "string" && /(bearer\s+|sk-[a-z0-9]|cookie=|api[_-]?key)/i.test(value)) return REDACTED as T;
  return value;
}
