import { Router } from "express";
import { config } from "../config.ts";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", env: config.env, uptime: process.uptime() });
});
