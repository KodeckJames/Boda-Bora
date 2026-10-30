import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { UssdPhone } from "./ussd-phone";

export const metadata: Metadata = { title: "USSD access" };

const notes = [
  { title: "No smartphone needed", body: "Any SIM, any handset. The score follows the rider's phone number, not the device." },
  { title: "Same score, same source", body: "USSD reads the latest computed Rider Safety Score and confidence from the scoring service." },
  { title: "Kiswahili first", body: "Menus default to Kiswahili, with English one keypress away." },
  { title: "Rider-controlled sharing", body: "Riders choose when to send their score to an insurer for a quote." },
];

export default function UssdPage() {
  return (
    <>
      <PageHeader
        eyebrow="USSD access"
        title="Check your score from any phone"
        description="When a rider's smartphone is dead, borrowed or sold, their score is still one short code away. Try it: dial *384*22# on the keypad, then press Call."
      />
      <div className="grid items-start gap-10 lg:grid-cols-[320px_1fr]">
        <UssdPhone />
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((n) => (
            <Card key={n.title}>
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{n.body}</p>
            </Card>
          ))}
          <Card className="sm:col-span-2">
            <h3 className="font-semibold">Menu map</h3>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-muted">{`*384*22#
├─ 1 Alama yangu ── 1 Maelezo zaidi
├─ 2 Ushauri wa wiki
├─ 3 Safari za wiki
├─ 4 Shiriki na bima ── 1 Ndiyo / 2 Hapana
└─ 0 English`}</pre>
          </Card>
        </div>
      </div>
    </>
  );
}
