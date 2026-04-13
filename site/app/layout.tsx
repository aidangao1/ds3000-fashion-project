import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latent Aesthetics in Japanese Menswear",
  description: "SVD analysis of 129 runway collections across six Japanese designers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
