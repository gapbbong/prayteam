import { Inter } from "next/font/google";
import "./globals.css";
import ErrorOverlay from "@/components/ErrorOverlay";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "🙏 기도팀 - 응답하시는 하나님",
  description: "우리의 기도를 들으시고 가장 좋은 때에 응답하시는 하나님",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-slate-50 min-h-screen text-slate-900`}>
        <AuthProvider>
          {children}
          <ErrorOverlay />
          <ServiceWorkerRegister />
        </AuthProvider>
      </body>
    </html>
  );
}

function ServiceWorkerRegister() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').then(
        function (registration) {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        function (err) {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
  return null;
}
