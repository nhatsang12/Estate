import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";
import i18n from "@/i18n/config";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import Head from "next/head";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "@/contexts/AuthContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import '@/styles/estoria.css'
import '@/styles/estoria-land.css'

const MessagingWidget = dynamic(() => import("@/components/messaging/MessagingWidget"), {
  ssr: false,
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("em_locale");
    if ((saved === "vi" || saved === "en") && i18n.resolvedLanguage !== saved) {
      void i18n.changeLanguage(saved);
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <MessagingProvider>
          <Head>
            <title>EstateManager</title>
            <meta
              name="description"
              content="EstateManager modern frontend foundation with authentication flow."
            />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </Head>
          <Component {...pageProps} />
          <MessagingWidget />
        </MessagingProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}
