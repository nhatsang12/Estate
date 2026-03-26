import "@/styles/globals.css";
import "leaflet/dist/leaflet.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { AuthProvider } from "@/contexts/AuthContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
import MessagingWidget from "@/components/messaging/MessagingWidget";
import '@/styles/estoria.css'
import '@/styles/estoria-land.css'
export default function App({ Component, pageProps }: AppProps) {
  return (
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
  );
}
