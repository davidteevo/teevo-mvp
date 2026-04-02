import type { ReactNode } from "react";

export function LegalDocument({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-3xl mx-auto px-5 sm:px-6 py-12 text-mowing-green">
      <header>
        <h1 className="text-3xl font-bold text-mowing-green">{title}</h1>
        <p className="mt-2 text-sm text-mowing-green/70">Last updated: {lastUpdated}</p>
      </header>
      <div className="mt-10 space-y-4 text-sm leading-relaxed text-mowing-green/90 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-mowing-green [&_h2]:mt-10 [&_h2]:mb-2 [&_h2:first-of-type]:mt-0 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-mowing-green [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-3 [&_li>ul]:mt-2 [&_a]:text-par-3-punch [&_a:hover]:underline">
        {children}
      </div>
    </article>
  );
}
