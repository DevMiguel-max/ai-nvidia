import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "NVIDIA Chat",
  description: "Private AI assistant powered by NVIDIA NIM.",
  robots: { index: false, follow: false },
  // Browser auto-translation (e.g. Google Translate) rewrites text nodes
  // directly in the DOM, outside of React's control. When that happens
  // while a message is actively streaming and React is also mutating that
  // same subtree, the two can race and React throws
  // "Failed to execute 'insertBefore' on 'Node'" trying to reconcile a tree
  // that was changed out from under it. This meta tag asks Chrome's
  // translate feature not to touch this page at all, removing that race.
  other: { google: "notranslate" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" translate="no" className={`notranslate ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-canvas font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
