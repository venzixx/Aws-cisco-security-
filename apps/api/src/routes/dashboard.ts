import { Router } from "express";

import { getDashboardPayload } from "../services/dashboardService.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_request, response, next) => {
  try {
    const payload = await getDashboardPayload();
    response.json(payload);
  } catch (error) {
    next(error);
  }
});
