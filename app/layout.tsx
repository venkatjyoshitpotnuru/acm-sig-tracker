import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ACM Chapter Portal',
  description: 'Coordinate domains, assign tasks, and track progress in real-time for ACM Special Interest Groups.',
  icons: {
    icon: '/acm-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#070b14] text-zinc-100 antialiased min-h-screen flex flex-col`}>
        {children}
      </body>
    </html>
  );
}