export const AUTH_COOKIE_NAME = "te_brain_pin_session";

export function getMasterPin(): string {
  return (process.env.APP_ACCESS_PIN || "070703").trim();
}

export function getExpectedAuthToken(): string {
  const pin = getMasterPin();
  // Deterministic token derived from PIN so Edge middleware & API routes can verify without native crypto dependencies
  let hash = 2166136261;
  const input = `te_brain_v1_salt_${pin}_verified`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `te_auth_${(hash >>> 0).toString(16)}_${pin.length}`;
}

export function isValidAuthToken(token?: string | null): boolean {
  if (!token) return false;
  return token === getExpectedAuthToken();
}
