import { Router } from "express";

import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    status: "ok",
    service: "monitoring-api",
    region: env.AWS_REGION,
    mode: env.DATA_MODE,
    timestamp: new Date().toISOString()
  });
});
