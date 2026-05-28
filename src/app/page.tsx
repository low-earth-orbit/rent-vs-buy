"use client";

import dynamic from "next/dynamic";
import Footer from "../components/Footer";
import Header from "../components/Header";

const Main = dynamic(() => import("../components/Main"), { ssr: false });

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Main />
      </main>
      <Footer />
    </>
  );
}
