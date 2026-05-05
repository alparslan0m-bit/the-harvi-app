import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set"
  );
}

// Single shared client — reused across all requests to avoid memory leaks.
// getUser(token) only validates the JWT; it doesn't need per-request state.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Express middleware that validates a Supabase JWT supplied as
 *   Authorization: Bearer <access_token>
 *
 * On success it attaches `req.userId` (the Supabase user UUID).
 * On failure it returns 401 — so a cloned app with a stolen anon key
 * can never call any protected endpoint without a real user session.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      req.log.warn({ supabaseError: error?.message }, "Auth: invalid token");
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = user.id;
    next();
  } catch (err) {
    req.log.error({ err }, "Auth middleware error");
    res.status(500).json({ error: "Authentication check failed" });
  }
}
