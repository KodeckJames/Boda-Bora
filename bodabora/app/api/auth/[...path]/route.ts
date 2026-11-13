import { auth } from "@/lib/auth/server";

// Same-origin proxy to Neon Auth; the browser client talks to this.
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
