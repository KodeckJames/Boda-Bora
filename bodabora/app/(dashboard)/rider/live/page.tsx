import type { Metadata } from "next";
import { Button, PageHeader } from "@/components/ui";
import { LiveDemo } from "./live-demo";

export const metadata: Metadata = { title: "Live sensor demo" };

export default function LivePage() {
  return (
    <>
      <PageHeader
        eyebrow="Live demo"
        title="Watch the score react"
        description="The phone sits loose in a pocket with no fixed mount. Sensor fusion re-orients the signal, then braking, cornering and acceleration events feed straight into the score."
        actions={<Button href="/rider" variant="secondary">← Rider app</Button>}
      />
      <LiveDemo />
    </>
  );
}
