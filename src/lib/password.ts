// Simple SHA-256 password hashing using Web Crypto API (Edge-compatible).
// For production, replace with bcrypt (Node.js only).

async function sha256Hex(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPassword(password: string): Promise<string> {
  return sha256Hex(password);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return (await sha256Hex(password)) === hash;
}
