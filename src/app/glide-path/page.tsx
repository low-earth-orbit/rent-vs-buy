import type { Metadata } from "next";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import GlidePathApp from "@/components/glide-path/GlidePathApp";
import Methodology from "@/components/glide-path/Methodology";

export const metadata: Metadata = {
  title: "Glide Path Recommender",
  description:
    "Find your optimal stock/bond mix at every age — before and after retirement — to maximize lifetime welfare, with a pension bridge, bequest target, and optional leverage.",
};

export default function GlidePathPage() {
  return (
    <>
      <Header
        title="Glide Path Recommender"
        subtitle="Find your optimal stock/bond mix at every age — before and after retirement."
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
