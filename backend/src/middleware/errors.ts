import type { ErrorRequestHandler, RequestHandler } from "express";
import { isProd } from "../config.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Express 5 forwards rejected promises from async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 && isProd ? "Internal server error" : err.message,
  });
};

// Placeholder for endpoints whose logic hasn't been written yet.
export const notImplemented: RequestHandler = (req, res) => {
  res.status(501).json({ error: "Not implemented yet", route: `${req.method} ${req.baseUrl}${req.path}` });
};
