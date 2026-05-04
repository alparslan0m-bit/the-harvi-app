declare global {
  namespace Express {
    interface Request {
      /** Supabase user UUID — set by the requireAuth middleware */
      userId?: string;
    }
  }
}

export {};
