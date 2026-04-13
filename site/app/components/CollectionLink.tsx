"use client";

const SLUGS: Record<string, string> = {
  cdg: "comme-des-garcons-homme-plus",
  yohji: "yohji-yamamoto",
  undercover: "undercover",
  sacai: "sacai",
  nine: "number-n-ine",
  visvim: "visvim",
};

export default function CollectionLink({
  d,
  s,
  children,
}: {
  d: string;
  s: string;
  children: React.ReactNode;
}) {
  const slug = SLUGS[d] || d;
  const hash = `#gallery/${slug}/${s}`;

  return (
    <a
      href={hash}
      onClick={(e) => {
        e.preventDefault();
        window.location.hash = `gallery/${slug}/${s}`;
        document.getElementById("biplot")?.scrollIntoView({ behavior: "smooth" });
      }}
      style={{
        color: "var(--dark)",
        fontWeight: 600,
        borderBottom: "1px solid var(--rule)",
      }}
    >
      {children}
    </a>
  );
}
