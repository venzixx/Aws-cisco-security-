import cors from "cors";
import express from "express";

import { dashboardRouter } from "./routes/dashboard.js";
import { healthRouter } from "./routes/health.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get("/", (_request, response) => {
    response.json({
      name: "Cisco AWS Secure Monitoring API",
      version: "0.1.0"
    });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({ message });
  });

  return app;
}
