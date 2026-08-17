import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm availability | Teevo",
  robots: { index: false, follow: false },
};

export default function ConfirmAvailabilityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
