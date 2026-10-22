import type { Metadata } from "next";
import { FitComingSoon } from "@/components/fit/FitComingSoon";
import { FIT_COMING_SOON, TEEVO_FIT_NAME } from "@/lib/fit-access";
import { viewerCanAccessTeevoFit } from "@/lib/fit-access.server";

export const dynamic = "force-dynamic";

const shareDescription = `${FIT_COMING_SOON.description} Coming soon.`;

export const metadata: Metadata = {
  title: `${TEEVO_FIT_NAME} | Teevo`,
  description: shareDescription,
  openGraph: {
    title: TEEVO_FIT_NAME,
    description: shareDescription,
    siteName: "Teevo",
  },
  twitter: {
    card: "summary",
    title: TEEVO_FIT_NAME,
    description: shareDescription,
  },
};

export default async function FitLayout({ children }: { children: React.ReactNode }) {
  const authorised = await viewerCanAccessTeevoFit();
  if (!authorised) return <FitComingSoon />;

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8">{children}</main>
  );
}
