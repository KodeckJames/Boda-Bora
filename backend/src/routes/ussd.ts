import { Router } from "express";

// USSD gateway callback. Gateways (e.g. Africa's Talking) POST form-encoded
// sessionId, serviceCode, phoneNumber and text, and expect a plain-text reply
// starting with "CON" (continue session) or "END" (close session).
export const ussdRouter = Router();

ussdRouter.post("/", (req, res) => {
  const { text = "" } = req.body ?? {};
  // TODO: route menu choices and look up the rider's score by phoneNumber.
  const reply =
    text === ""
      ? "CON Karibu Boda Bora\n1. Alama yangu\n2. Ushauri wa wiki\n3. Safari za wiki\n4. Shiriki na bima\n0. English"
      : "END Huduma hii inakuja hivi karibuni.";
  res.type("text/plain").send(reply);
});
