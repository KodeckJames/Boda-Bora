import { Router } from "express";
import { notImplemented } from "../middleware/errors.ts";

// Underwriting: tiers, score distribution, quote requests.
export const insurerRouter = Router();

insurerRouter.get("/tiers", notImplemented);
insurerRouter.get("/distribution", notImplemented);
insurerRouter.get("/quotes", notImplemented);
insurerRouter.post("/quotes/:quoteId/decision", notImplemented);
