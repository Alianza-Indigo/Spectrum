import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: {
    default: `${site.fullName}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.fullName,
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#090b12",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
