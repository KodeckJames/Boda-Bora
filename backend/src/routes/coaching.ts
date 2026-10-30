import { Router } from "express";
import { notImplemented } from "../middleware/errors.ts";

// Gemini-generated Kiswahili coaching messages.
export const coachingRouter = Router();

coachingRouter.get("/:riderId", notImplemented); // latest coaching message
coachingRouter.post("/:riderId/generate", notImplemented); // regenerate from this week's trace
coachingRouter.post("/:riderId/send", notImplemented); // send via SMS
