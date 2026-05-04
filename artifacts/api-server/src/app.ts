import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { requireAuth } from "./middlewares/auth";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public — uptime monitors must reach this without a session token.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Everything else under /api requires a valid Supabase session.
// A competitor who extracts the anon key from the app bundle still gets 401
// on every API call unless they also have a real authenticated user token.
app.use("/api", requireAuth, router);

export default app;
