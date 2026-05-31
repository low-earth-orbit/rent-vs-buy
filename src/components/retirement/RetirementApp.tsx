"use client";

import dynamic from "next/dynamic";

// Loaded client-side only so localStorage-backed state never causes a
// hydration mismatch (ssr:false must live inside a client component).
const Main = dynamic(() => import("./Main"), { ssr: false });

export default function RetirementApp() {
  return <Main />;
}
