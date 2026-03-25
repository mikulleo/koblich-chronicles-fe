import { Metadata } from "next";
import MentalEdgeClient from "./MentalEdgeClient";

export const metadata: Metadata = {
  title: "Mental Edge | Koblich Chronicles",
  description: "Track your trading psychology, identify emotional traps, and build discipline through structured self-awareness.",
};

export default function MentalEdgePage() {
  return <MentalEdgeClient />;
}
