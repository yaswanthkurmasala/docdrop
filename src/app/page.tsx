import React from "react";
import { DocDropStudio } from "@/components/DocDropStudio";
import { buildHomeJsonLd } from "@/lib/seo-data";

export default function Home() {
  const jsonLd = buildHomeJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DocDropStudio initialToolId="pdf-to-markdown" />
    </>
  );
}
