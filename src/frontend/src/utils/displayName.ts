/**
 * Parse a displayName field that may be plain text or JSON-encoded
 * with format: {"n": name, "m": mobile, "p": mpin}
 */
export function parseDisplayName(raw: string): {
  name: string;
  mobile: string;
  mpin: string;
} {
  if (!raw) return { name: "", mobile: "", mpin: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.n) {
      return {
        name: parsed.n || "",
        mobile: parsed.m || "",
        mpin: parsed.p || "",
      };
    }
  } catch {
    // Not JSON — plain text name
  }
  return { name: raw, mobile: "", mpin: "" };
}
