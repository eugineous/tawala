import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "TAWALA — Life OS",
  description: "Your personal Life Operating System",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Kill any stale service workers IMMEDIATELY before anything else loads */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
      });
      navigator.serviceWorker.ready.then(function(reg) {
        reg.unregister();
      }).catch(function(){});
    }
    if (window.caches) {
      caches.keys().then(function(keys) {
        for (var i = 0; i < keys.length; i++) { caches.delete(keys[i]); }
      });
    }
  } catch(e) {}
})();
        `}} />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
