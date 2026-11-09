import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Boda Bora — Rider Safety Score",
    short_name: "Boda Bora",
    description:
      "Check your Rider Safety Score, record your shifts and get weekly coaching in English or Kiswahili.",
    start_url: "/rider", // proxy.ts adds the saved language: /sw/rider or /en/rider
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1a14",
    theme_color: "#0f1a14",
    categories: ["transportation", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Start shift",
        short_name: "Start shift",
        url: "/rider/ride",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
