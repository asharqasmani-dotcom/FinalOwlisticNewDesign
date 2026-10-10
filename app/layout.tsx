import type { Metadata } from "next";
import { SiteScripts } from "@/components/SiteScripts";

const description =
  "We manage your social media, customer inquiries, and online presence so you can focus on growing your business. Start with $0 upfront. $300/month after your first month if satisfied.";

export const metadata: Metadata = {
  title: "Owlistic Studio | Your Business. Our Responsibility.",
  description,
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Owlistic Studio",
    title: "Owlistic Studio | Your Business. Our Responsibility.",
    description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/PPFrama-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          href="/fonts/PPFramaText-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
        <link rel="stylesheet" href="/_astro/global.Btqt_PqA.css" />
        <link rel="stylesheet" href="/inline/pixelated.css" />
        <link rel="stylesheet" href="/_astro/Base.Cz7aN_E5.css" />
        <link rel="stylesheet" href="/inline/components.css" />
        <link rel="stylesheet" href="/_astro/index.BvW567VI.css" />
        <link rel="stylesheet" href="/custom.css" />
      </head>
      <body>
        <noscript>
          <style>{`.transition { display: none; }`}</style>
        </noscript>
        {children}
        <SiteScripts />
      </body>
    </html>
  );
}
