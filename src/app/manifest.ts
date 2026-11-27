import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DocDrop — Private Document Studio",
    short_name: "DocDrop",
    description:
      "100% private in-browser PDF tools & document converter. Process, merge, convert, sign, and redact documents in local RAM with zero server uploads.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#7c3aed",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["utilities", "productivity", "business"],
  };
}
