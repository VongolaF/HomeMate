import "./globals.css";
import AppShell from "@/components/AppShell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className="bg-page text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
