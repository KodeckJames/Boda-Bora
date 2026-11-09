"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

type Screen = { text: string; options?: Record<string, string>; end?: boolean };

// Static menu trees for the UI, one per language. Will be replaced by the USSD gateway
// callback responses. Option 0 on the home menu switches language, as the live menu will.
const menus: Record<Locale, Record<string, Screen>> = {
  sw: {
    home: {
      text: "Karibu Boda Bora\n1. Alama yangu\n2. Ushauri wa wiki\n3. Safari za wiki\n4. Shiriki na bima\n0. English",
      options: { "1": "score", "2": "coach", "3": "trips", "4": "share", "0": "lang:en" },
    },
    score: {
      text: "Alama yako: 64/100\nHatari: Wastani\nUaminifu wa data: 88%\nWiki hii: -3\n\n1. Maelezo zaidi\n0. Rudi",
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
      text: "Asante! Alama yako imetumwa. Utapokea bei kwa SMS ndani ya saa 24.",
      end: true,
    },
  },
  en: {
    home: {
      text: "Welcome to Boda Bora\n1. My score\n2. Weekly advice\n3. This week's trips\n4. Share with insurer\n0. Kiswahili",
      options: { "1": "score", "2": "coach", "3": "trips", "4": "share", "0": "lang:sw" },
    },
    score: {
      text: "Your score: 64/100\nRisk: Moderate\nData confidence: 88%\nThis week: -3\n\n1. More detail\n0. Back",
      options: { "1": "breakdown", "0": "home" },
    },
    breakdown: {
      text: "Braking: 58\nCornering: 66\nAcceleration: 61\nNight hours: 55\nRoute risk: 70\n\n0. Back",
      options: { "0": "score" },
    },
    coach: {
      text: "Slow to 30km/h approaching the Githurai 45 roundabout, 6:30-7:30 pm. The full message was sent by SMS.\n\n0. Back",
      options: { "0": "home" },
    },
    trips: {
      text: "This week:\nTrips: 121\nKm: 538\nNight: 34%\nEvents: 7\n\n0. Back",
      options: { "0": "home" },
    },
    share: {
      text: "Send your score to an insurer?\n1. Yes\n2. No",
      options: { "1": "shared", "2": "home" },
    },
    shared: {
      text: "Thank you! Your score was sent. You'll get a quote by SMS within 24 hours.",
      end: true,
    },
  },
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function UssdPhone() {
  const { locale, t } = useI18n();
  const u = t.ussd;
  const [screen, setScreen] = useState<string | null>(null); // null = not in a session
  const [menuLang, setMenuLang] = useState<Locale>(locale);
  const [input, setInput] = useState("");

  const current = screen ? menus[menuLang][screen]! : null;
  const inSession = current !== null;

  function send() {
    if (!current) {
      if (input.trim() === "*384*22#") {
        setMenuLang(locale);
        setScreen("home");
      }
      setInput("");
      return;
    }
    if (current.end) {
      setScreen(null);
    } else {
      const next = current.options?.[input.trim()];
      if (next?.startsWith("lang:")) {
        setMenuLang(next.slice(5) as Locale);
        setScreen("home");
      } else if (next) setScreen(next);
    }
    setInput("");
  }

  function cancel() {
    setScreen(null);
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
        <div className="h-52 overflow-y-auto whitespace-pre-wrap" lang={inSession ? menuLang : locale}>
          {current ? current.text : <span className="opacity-70">{u.dialHint}</span>}
        </div>
        <div className="mt-2 flex h-7 items-center border-t border-[#1c2414]/30 pt-1">
          <span className="truncate">{input || (current && !current.end ? "_" : "")}</span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold">
          <span>{inSession ? u.cancel : u.clear}</span>
          <span>{current ? (current.end ? u.ok : u.send) : u.call}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-3">
        <button type="button" onClick={inSession ? cancel : () => setInput("")} className="h-9 flex-1 rounded-full bg-danger/80 text-xs font-semibold text-white">
          {inSession ? u.cancel : u.clear}
        </button>
        <button type="button" onClick={send} className="h-9 flex-1 rounded-full bg-safe text-xs font-semibold text-white">
          {current ? (current.end ? u.ok : u.send) : u.call}
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
