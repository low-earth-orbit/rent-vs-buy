"use client";

import dynamic from "next/dynamic";

// Loaded client-side only (ssr:false must live inside a client component) so
// browser-only APIs like FileReader never cause a hydration mismatch.
const Main = dynamic(() => import("./Main"), { ssr: false });

export default function AcbApp() {
  return <Main />;
}
