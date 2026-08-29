import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shadowledger-six.vercel.app"),
  title: {
    default: "ShadowLedger — Private payroll on STRK20",
    template: "%s · ShadowLedger",
  },
  description:
    "Private payroll with public aggregate accountability on Starknet STRK20.",
  applicationName: "ShadowLedger",
  openGraph: {
    type: "website",
    title: "ShadowLedger — Private payroll on STRK20",
    description: "Commit a payroll total publicly while keeping each recipient and amount private.",
  },
  twitter: { card: "summary", title: "ShadowLedger", description: "Private payroll. Public aggregate accountability." },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
