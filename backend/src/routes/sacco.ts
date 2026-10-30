import { Router } from "express";
import { notImplemented } from "../middleware/errors.ts";

// SACCO fleet monitoring and shift records (used for coverage cross-checks).
export const saccoRouter = Router();

saccoRouter.get("/:saccoId/fleet", notImplemented); // fleet stats + rider list
saccoRouter.get("/:saccoId/flags", notImplemented); // riders needing attention
saccoRouter.post("/:saccoId/shifts", notImplemented); // upload shift records
