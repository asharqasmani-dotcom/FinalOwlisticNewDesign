"use client";

import { useEffect } from "react";

const SCRIPTS = [
  "/runtime.js",
  "/_astro/Nav.astro_astro_type_script_index_0_lang.BTi8Y4C0.js",
  "/_astro/Footer.astro_astro_type_script_index_0_lang.QLgbxcz6.js",
  "/_astro/Base.astro_astro_type_script_index_0_lang.C-STEiC0.js",
  "/faq.js",
  "/homepage.js",
];

export function SiteScripts() {
  useEffect(() => {
    if (document.documentElement.dataset.homeScripts === "ready") return;
    document.documentElement.dataset.homeScripts = "ready";

    for (const src of SCRIPTS) {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      if (src.includes("/_astro/")) script.type = "module";
      document.body.appendChild(script);
    }
  }, []);

  return null;
}
