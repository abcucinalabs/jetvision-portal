export function normalizeAuthToken(raw: string): string {
  const trimmed = raw
    .trim()
    .replace(/^["'“”]|["'“”]$/g, "")
  const withoutHeaderLabel = trimmed.replace(/^Authorization\s*:\s*/i, "")
  const withoutBearer = withoutHeaderLabel.replace(/^Bearer\s+/i, "")
  // JWT-style tokens should not contain whitespace; remove accidental line breaks/spaces from paste.
  return withoutBearer.replace(/\s+/g, "")
}

export function buildAuthorizationHeader(raw: string): string {
  const token = normalizeAuthToken(raw)
  if (!token) {
    throw new Error("Missing AVINODE_AUTH_TOKEN. Set a valid bearer token in .env.local and restart the server.")
  }
  if (/[^\x21-\x7E]/.test(token)) {
    throw new Error("Invalid AVINODE_AUTH_TOKEN format. Remove smart quotes or hidden characters and restart the server.")
  }
  return `Bearer ${token}`
}
