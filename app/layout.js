import './globals.css';
import { Sora, Inter } from 'next/font/google';

const head = Sora({ subsets: ['latin'], variable: '--font-head', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = { title: 'SYNTH: think, build, evolve', description: 'Free AI assistant that reads images, plus a web app builder.' };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#05070f' };

export default function RootLayout({ children }) {
  return (<html lang="en" className={`${head.variable} ${body.variable}`}><body>{children}</body></html>);
}
