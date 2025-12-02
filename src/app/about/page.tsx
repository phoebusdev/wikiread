'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen paper-texture paper-grain">
      {/* Header */}
      <header className="pt-8 pb-6 px-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 transition-colors mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to WikiRead
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-serif text-ink-800 text-emboss"
          >
            About WikiRead
          </motion.h1>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-paper-50 rounded-xl shadow-paper border border-paper-200 overflow-hidden">
            <div className="p-8 md:p-10 space-y-8">
              {/* Mission */}
              <section>
                <h2 className="text-xl font-serif text-ink-700 mb-4">Our Mission</h2>
                <p className="text-ink-600 leading-relaxed">
                  WikiRead exists to make dense academic texts more accessible. We believe that
                  understanding shouldn't be gated by prerequisite knowledge—every reader deserves
                  the context they need, precisely when they need it.
                </p>
              </section>

              {/* The Problem */}
              <section>
                <h2 className="text-xl font-serif text-ink-700 mb-4">The Problem We Solve</h2>
                <p className="text-ink-600 leading-relaxed mb-4">
                  Academic texts are full of references, citations, and footnotes that assume
                  familiarity with other works, thinkers, and concepts. For many readers, this
                  creates an invisible barrier—you're left wondering who Deleuze is while trying
                  to understand what Foucault means.
                </p>
                <p className="text-ink-600 leading-relaxed">
                  WikiRead bridges this gap by automatically linking footnotes to Wikipedia,
                  giving you instant access to the context you need without breaking your reading flow.
                </p>
              </section>

              {/* How It Works */}
              <section>
                <h2 className="text-xl font-serif text-ink-700 mb-4">How It Works</h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium text-sm">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium text-ink-700">Upload your EPUB</h3>
                      <p className="text-sm text-ink-500">Drag and drop or click to select your file</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium text-ink-700">We scan footnotes</h3>
                      <p className="text-sm text-ink-500">Our system identifies names, concepts, and references</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-medium text-sm">
                      3
                    </div>
                    <div>
                      <h3 className="font-medium text-ink-700">Download enhanced EPUB</h3>
                      <p className="text-sm text-ink-500">Your book now has Wikipedia links embedded in footnotes</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Privacy */}
              <section>
                <h2 className="text-xl font-serif text-ink-700 mb-4">Privacy First</h2>
                <p className="text-ink-600 leading-relaxed">
                  Your books are processed entirely in your browser. We never upload, store,
                  or read your files. The EPUB never leaves your device—what you read is your business.
                </p>
              </section>

              {/* Team */}
              <section>
                <h2 className="text-xl font-serif text-ink-700 mb-4">The Team</h2>
                <p className="text-ink-600 leading-relaxed">
                  WikiRead is built by readers, for readers. We're a small team passionate about
                  making knowledge more accessible and reading more enjoyable.
                </p>
                <p className="text-ink-500 text-sm mt-4 italic">
                  More details coming soon.
                </p>
              </section>

              {/* Contact */}
              <section className="pt-6 border-t border-paper-200">
                <h2 className="text-xl font-serif text-ink-700 mb-4">Get in Touch</h2>
                <p className="text-ink-600 leading-relaxed">
                  Have questions, feedback, or suggestions? We'd love to hear from you.
                </p>
                <p className="text-ink-500 text-sm mt-4 italic">
                  Contact form coming soon.
                </p>
              </section>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-dark text-white rounded-lg font-medium transition-colors shadow-paper"
            >
              Try WikiRead Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center border-t border-paper-200">
        <div className="flex justify-center gap-6 text-sm text-ink-400">
          <Link href="/" className="hover:text-ink-600 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-ink-600 transition-colors">About</Link>
          <Link href="/scholar" className="hover:text-ink-600 transition-colors">Scholar</Link>
        </div>
      </footer>
    </div>
  )
}
