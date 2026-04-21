import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SwKiller } from '@/components/SwKiller';
import { ThemeProvider, themeScript } from '@/components/ui/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'MamaCare AI — Suivi de grossesse intelligent',
  description:
    'Application de santé maternelle pour la Guinée. Questionnaire quotidien, alertes médicales en temps réel, suivi personnalisé par IA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MamaCare AI',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#E91E8C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // WCAG 1.4.4 — le zoom doit rester accessible aux malvoyants
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Script anti-flash dark mode — s'exécute avant le premier paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {process.env.NODE_ENV === 'development' && <SwKiller />}
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
