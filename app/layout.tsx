import type { Metadata } from "next";
import { SiteScripts } from "@/components/SiteScripts";

const description =
  "We manage your social media, customer inquiries, and online presence so you can focus on growing your business. Start with $0 upfront. $300/month after your first month if satisfied.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.owlisticstudio.com"),
  title: "Owlistic Studio | Your Business. Our Responsibility.",
  description,
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: "https://www.owlisticstudio.com/",
    siteName: "Owlistic Studio",
    title: "Owlistic Studio | Your Business. Our Responsibility.",
    description,
  },
  twitter: {
    card: "summary_large_image",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Owlistic Studio",
  url: "https://www.owlisticstudio.com",
  email: "Ashar@owlisticstudio.com",
  sameAs: ["https://www.linkedin.com/in/muhammad-ashar/"],
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
        <link rel="stylesheet" href="/_astro/btn-bubble-arrow.css" />
        <link rel="stylesheet" href="/inline/components.css" />
        <link rel="stylesheet" href="/_astro/index.BvW567VI.css" />
        <link rel="stylesheet" href="/custom.css" />
        <link rel="stylesheet" href="/runtime.css" />
        <link rel="preload" as="image" href="/img/home-planet.webp" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
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
