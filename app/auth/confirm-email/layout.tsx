import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirm your email | Teevo",
  robots: { index: false, follow: false },
};

export default function ConfirmEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
