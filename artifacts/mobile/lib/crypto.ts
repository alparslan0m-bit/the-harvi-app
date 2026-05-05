const XOR_KEY = "harvi-quiz-secure-key-2024";

/** Unicode-safe base64 encode */
export function safeBtoa(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

/** Unicode-safe base64 decode */
export function safeAtob(b64: string): string {
  return decodeURIComponent(
    atob(b64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

export function decryptAnswer(encrypted: string): { answer: number; explanation: string } {
  if (!encrypted) return { answer: 0, explanation: "" };

  // Try 1: XOR decryption (original Harvi encrypted format)
  try {
    const decoded = atob(encrypted);
    let decrypted = "";
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(
        decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
      );
    }
    const parsed = JSON.parse(decrypted);
    if (typeof parsed.answer === "number") {
      console.log("[decrypt] XOR path success");
      return { answer: parsed.answer, explanation: parsed.explanation ?? "" };
    }
  } catch { /* fall through */ }

  // Try 2: Unicode-safe base64-encoded plain JSON (built by buildSecure)
  try {
    const decoded = safeAtob(encrypted);
    const parsed = JSON.parse(decoded);
    if (typeof parsed.answer === "number") {
      console.log("[decrypt] safeBtoa path success");
      return { answer: parsed.answer, explanation: parsed.explanation ?? "" };
    }
  } catch { /* fall through */ }

  // Try 3: plain base64 JSON (ASCII only, older format)
  try {
    const decoded = atob(encrypted);
    const parsed = JSON.parse(decoded);
    if (typeof parsed.answer === "number") {
      console.log("[decrypt] plain btoa path success");
      return { answer: parsed.answer, explanation: parsed.explanation ?? "" };
    }
  } catch { /* fall through */ }

  console.error("[decrypt] ALL PATHS FAILED — no valid answer for:", encrypted.slice(0, 20) + "...");
  return { answer: -1, explanation: "" };
}
