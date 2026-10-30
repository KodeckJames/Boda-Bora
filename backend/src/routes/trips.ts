import { Router } from "express";
import { notImplemented } from "../middleware/errors.ts";

// Sensor trace ingestion from the phone app (batched, uploaded over WiFi at night).
export const tripsRouter = Router();

tripsRouter.post("/batch", notImplemented); // upload a batch of trip traces
tripsRouter.get("/:id", notImplemented); // single trip detail
