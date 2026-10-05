import { Inter } from "next/font/google";
import "./globals.css";
import ErrorOverlay from "@/components/ErrorOverlay";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "기도팀 - 반드시 응답하시는 하나님",
  description: "우리의 기도를 들으시고 가장 좋은 때에 응답하시는 하나님",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

import Script from "next/script";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen`}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <ErrorOverlay />
            <ServiceWorkerRegister />
          </ToastProvider>
        </AuthProvider>
        <Script id="clarity-script" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "uvhhapfki9");
          `}
        </Script>
      </body>
    </html>
  );
}
