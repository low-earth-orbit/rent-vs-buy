import type { Metadata } from "next";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import GlidePathApp from "@/components/glide-path/GlidePathApp";
import Methodology from "@/components/glide-path/Methodology";

export const metadata: Metadata = {
  title: "Lifetime Allocation Optimizer",
  description:
    "Compare an optimized equity path with the best constant allocation for your circumstances.",
};

export default function GlidePathPage() {
  return (
    <>
      <Header
        title="Lifetime Allocation Optimizer"
        subtitle="Compare an optimized equity path with the best constant allocation for your circumstances."
        showHomeLink
      />
      <main>
        <GlidePathApp />
      </main>
      <Methodology />
      <Footer />
    </>
  );
}
