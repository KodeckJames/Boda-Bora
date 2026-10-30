import { app } from "./app.ts";
import { config } from "./config.ts";

app.listen(config.port, (error) => {
  if (error) throw error;
  console.log(`Boda Bora API listening on http://localhost:${config.port}`);
});
