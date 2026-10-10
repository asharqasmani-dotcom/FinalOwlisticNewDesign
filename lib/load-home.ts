import { readFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "content/home");

function read(name: string) {
  return readFileSync(path.join(dir, name), "utf8").trimEnd();
}

const mainSections = [
  "hero.html",
  "tiers.html",
  "quote.html",
  "reviews.html",
  "cases.html",
  "arc.html",
  "team.html",
  "separates.html",
  "guides.html",
];

export function loadHomeMarkup() {
  return [
    read("transition.html"),
    read("nav.html"),
    "<main>",
    ...mainSections.map(read),
    "</main>",
    read("footer.html"),
    read("consent.html"),
  ].join("\n");
}
