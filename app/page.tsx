import { loadHomeMarkup } from "@/lib/load-home";

export default function HomePage() {
  return (
    <div
      id="home"
      style={{ display: "contents" }}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: loadHomeMarkup() }}
    />
  );
}
