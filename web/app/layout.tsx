import type { Metadata } from "next";
import "./globals.css";
import "./video-preview.css";

export const metadata: Metadata = {
  title: "VideoVault · Guarda lo que te inspira",
  description: "Encuentra y descarga vídeos, audio e imágenes desde enlaces públicos.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
