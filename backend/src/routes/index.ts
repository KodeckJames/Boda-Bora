import { Router } from "express";
import { coachingRouter } from "./coaching.ts";
import { healthRouter } from "./health.ts";
import { insurerRouter } from "./insurer.ts";
import { ridersRouter } from "./riders.ts";
import { saccoRouter } from "./sacco.ts";
import { tripsRouter } from "./trips.ts";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/riders", ridersRouter);
apiRouter.use("/trips", tripsRouter);
apiRouter.use("/coaching", coachingRouter);
apiRouter.use("/sacco", saccoRouter);
apiRouter.use("/insurer", insurerRouter);
