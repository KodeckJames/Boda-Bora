"use client";

import { useState } from "react";

// Static menu tree for the UI. Will be replaced by the USSD gateway callback responses.
const screens: Record<string, { text: string; options?: Record<string, string>; end?: boolean }> = {
  idle: { text: "" },
  home: {
    text: "Karibu Boda Bora\n1. Alama yangu\n2. Ushauri wa wiki\n3. Safari za wiki\n4. Shiriki na bima\n0. English",
    options: { "1": "score", "2": "coach", "3": "trips", "4": "share" },
  },
  score: {
    text: "Alama yako: 64/100\nHatari: Wastani\nImani ya data: 88%\nWiki hii: -3\n\n1. Maelezo zaidi\n0. Rudi",
    options: { "1": "breakdown", "0": "home" },
  },
  breakdown: {
    text: "Breki: 58\nKona: 66\nKuongeza mwendo: 61\nSaa za usiku: 55\nHatari ya njia: 70\n\n0. Rudi",
    options: { "0": "score" },
  },
  coach: {
    text: "Punguza mwendo hadi 30km/h ukikaribia mzunguko wa Githurai 45, saa 12:30-1:30 jioni. Ujumbe kamili umetumwa kwa SMS.\n\n0. Rudi",
    options: { "0": "home" },
  },
  trips: {
    text: "Wiki hii:\nSafari: 121\nKm: 538\nUsiku: 34%\nMatukio: 7\n\n0. Rudi",
    options: { "0": "home" },
  },
  share: {
    text: "Tuma alama kwa bima?\n1. Ndiyo\n2. Hapana",
    options: { "1": "shared", "2": "home" },
  },
  shared: {
    text: "Asante! Alama yako imetumwa. Utapokea nukuu kwa SMS ndani ya saa 24.",
    end: true,
  },
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function UssdPhone() {
  const [screen, setScreen] = useState("idle");
  const [input, setInput] = useState("");

  const current = screens[screen];
  const inSession = screen !== "idle";

  function send() {
    if (!inSession) {
      if (input.trim() === "*384*22#") setScreen("home");
      setInput("");
      return;
    }
    if (current.end) {
      setScreen("idle");
    } else {
      const next = current.options?.[input.trim()];
      if (next) setScreen(next);
    }
    setInput("");
  }

  function cancel() {
    setScreen("idle");
    setInput("");
  }

  return (
    <div className="mx-auto w-[290px] rounded-[2.5rem] bg-[#2b2f33] p-5 pb-7 shadow-2xl">
      <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-black/40" />
      <div className="rounded-lg border-4 border-black/50 bg-[#c7d3b3] p-3 font-mono text-[13px] leading-snug text-[#1c2414]">
        <div className="mb-2 flex justify-between text-[10px]">
          <span>▂▄▆ Safaricom</span>
          <span>▮▮▮▯</span>
        </div>
        <div className="h-52 overflow-y-auto whitespace-pre-wrap">
          {inSession ? current.text : <span className="opacity-70">Dial *384*22# to check your score</span>}
        </div>
        <div className="mt-2 flex h-7 items-center border-t border-[#1c2414]/30 pt-1">
          <span className="truncate">{input || (inSession && !current.end ? "_" : "")}</span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold">
          <span>{inSession ? "Cancel" : "Clear"}</span>
          <span>{inSession ? (current.end ? "OK" : "Send") : "Call"}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <button type="button" onClick={inSession ? cancel : () => setInput("")} className="h-9 flex-1 rounded-full bg-danger/80 text-xs font-semibold text-white">
          {inSession ? "Cancel" : "Clear"}
        </button>
        <button type="button" onClick={send} className="h-9 flex-1 rounded-full bg-safe text-xs font-semibold text-white">
          {inSession ? (current.end ? "OK" : "Send") : "Call"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setInput((v) => v + k)}
            className="h-11 rounded-xl bg-[#3d4247] text-lg font-semibold text-white active:bg-[#55595e]"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
