import type { Metadata } from "next";
import { TermsContent } from "@/components/legal/TermsContent";

export const metadata: Metadata = {
  title: "Terms & Conditions | Teevo",
  description: "Terms and conditions for using Teevo, the UK golf equipment marketplace.",
};

export default function TermsPage() {
  return <TermsContent />;
}
