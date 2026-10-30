import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { config, isProd } from "./config.ts";
import { errorHandler, notFound } from "./middleware/errors.ts";
import { apiRouter } from "./routes/index.ts";
import { ussdRouter } from "./routes/ussd.ts";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.corsOrigins }));
app.use(morgan(isProd ? "combined" : "dev"));
app.use(express.json({ limit: "5mb" })); // trip batches can be large
app.use(express.urlencoded({ extended: false })); // USSD gateways post form data

app.get("/", (_req, res) => {
  res.json({ name: "Boda Bora API", docs: "/api/health" });
});

app.use("/api", apiRouter);
app.use("/ussd", ussdRouter);

app.use(notFound);
app.use(errorHandler);
