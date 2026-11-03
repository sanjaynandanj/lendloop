export async function signature(
  secret: string,
  timestamp: string,
  body: string,
) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(timestamp + "." + body),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export async function verified(
  secret: string,
  t: string,
  body: string,
  s: string,
) {
  if (
    !t ||
    !Number.isFinite(Number(t)) ||
    Math.abs(Date.now() - Number(t)) > 300000 ||
    !/^[a-f0-9]{64}$/.test(s)
  )
    return false;
  const expected = await signature(secret, t, body);
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ s.charCodeAt(i);
  return diff === 0;
}
