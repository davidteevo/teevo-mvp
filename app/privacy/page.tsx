import type { Metadata } from "next";
import { PrivacyContent } from "@/components/legal/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | Teevo",
  description: "How Teevo collects, uses, and protects your personal data when you use our platform.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
