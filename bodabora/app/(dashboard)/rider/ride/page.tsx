import type { Metadata } from "next";
import { Button, PageHeader } from "@/components/ui";
import { RideMode } from "./ride-mode";

export const metadata: Metadata = { title: "Ride mode" };

export default function RidePage() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow="Ride mode"
        title="Rekodi zamu yako"
        description="Record your shift. Start when you begin riding, keep the app open, and finish when you're done."
        actions={<Button href="/rider" variant="secondary">← Rider app</Button>}
      />
      <RideMode />
    </div>
  );
}
