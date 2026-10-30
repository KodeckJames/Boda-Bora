import { Router } from "express";
import { notImplemented } from "../middleware/errors.ts";

// Rider profiles, scores and weekly traces.
export const ridersRouter = Router();

ridersRouter.get("/", notImplemented); // list riders
ridersRouter.get("/:id", notImplemented); // rider profile
ridersRouter.get("/:id/score", notImplemented); // current Rider Safety Score + sub-scores + coverage confidence
ridersRouter.get("/:id/week", notImplemented); // weekly trace: events, hourly risk, route
ridersRouter.get("/:id/trips", notImplemented); // recent trips
