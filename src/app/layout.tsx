import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WikiRead - Add Wikipedia Links to Your EPUBs',
  description: 'Automatically add Wikipedia links to footnotes in your EPUB files. Perfect for philosophy, history, and academic texts.',
  keywords: ['EPUB', 'Wikipedia', 'ebooks', 'footnotes', 'academic', 'philosophy', 'history'],
  authors: [{ name: 'WikiRead' }],
  openGraph: {
    title: 'WikiRead - Add Wikipedia Links to Your EPUBs',
    description: 'Automatically add Wikipedia links to footnotes in your EPUB files.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-paper-100 text-ink-700 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
