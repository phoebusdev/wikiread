'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setStatus('success')
        setEmail('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-center gap-3 p-4 bg-green-50 text-green-700 rounded-xl"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">You're on the list! We'll notify you when Scholar launches.</span>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="flex-1 px-4 py-3 bg-white border border-paper-300 rounded-xl text-ink-700 placeholder-ink-300 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
        required
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="px-8 py-3 bg-accent hover:bg-accent-dark text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-paper"
      >
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </button>
    </form>
  )
}

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    title: 'Personalized Annotations',
    description: 'Scholar learns what you already know. Reading Heidegger but unfamiliar with Husserl? You\'ll get explanations for phenomenology without redundant definitions of philosophy basics.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    title: 'Knowledge Profile',
    description: 'Tell us your background—your field, the books you\'ve read, the thinkers you know. Your profile grows with each book, making future annotations even more precise.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    title: 'Chat With Your Text',
    description: 'Select any passage and ask questions. Scholar uses retrieval-augmented generation to answer based on the book\'s content, not generic responses.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: 'Mobile E-Reader',
    description: 'Read in your browser on any device. Highlight text, take notes, and access AI assistance—all synced across your devices.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: 'Prerequisite Detection',
    description: 'Before you start a book, Scholar tells you what background knowledge would help. Get reading recommendations tailored to your gaps.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    title: 'Zotero Export',
    description: 'Export all your annotations, highlights, and notes in Zotero-compatible formats. Your research stays portable and organized.',
  },
]

const useCases = [
  {
    persona: 'The Philosophy Student',
    scenario: 'Reading "Anti-Oedipus" for a seminar but missing the Freud and Lacan background.',
    solution: 'Scholar identifies psychoanalytic concepts you haven\'t encountered and explains them in context, without assuming you\'ve read all of Freud.',
  },
  {
    persona: 'The Self-Taught Reader',
    scenario: 'Tackling "Capital" without formal economics training.',
    solution: 'Scholar detects when Marx references Ricardo or Smith, providing just enough context to follow the argument without overwhelming you with economics history.',
  },
  {
    persona: 'The Cross-Disciplinary Researcher',
    scenario: 'A biologist reading philosophy of science for the first time.',
    solution: 'Scholar adjusts explanations knowing you understand scientific methodology but may need context on Kuhn, Popper, or Feyerabend.',
  },
]

export default function ScholarPage() {
  return (
    <div className="min-h-screen paper-texture paper-grain">
      {/* Hero */}
      <header className="pt-12 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-600 transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to WikiRead
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Coming Soon
            </div>

            <h1 className="text-4xl md:text-6xl font-serif text-ink-800 text-emboss mb-6">
              WikiRead Scholar
            </h1>

            <p className="text-xl md:text-2xl text-ink-500 font-light max-w-2xl mx-auto mb-4">
              AI-powered reading companion for dense academic texts
            </p>

            <p className="text-lg text-ink-400 max-w-xl mx-auto">
              Personalized annotations that adapt to what you already know.
              No more looking up every reference—Scholar brings the context to you.
            </p>
          </motion.div>
        </div>
      </header>

      {/* Waitlist CTA */}
      <section className="px-6 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xl mx-auto"
        >
          <div className="bg-paper-50 rounded-2xl shadow-paper border border-paper-200 p-6 md:p-8">
            <h2 className="text-center text-lg font-medium text-ink-700 mb-4">
              Be the first to know when Scholar launches
            </h2>
            <WaitlistForm />
            <p className="text-center text-xs text-ink-400 mt-4">
              No spam. We'll only email you about Scholar.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Problem Statement */}
      <section className="px-6 py-16 bg-gradient-to-b from-paper-100/50 to-transparent">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-serif text-ink-700 mb-6">
              Academic texts assume you've done the reading
            </h2>
            <p className="text-lg text-ink-500 leading-relaxed">
              Every book builds on others. Authors reference thinkers, cite works, and use concepts
              that assume familiarity. For readers entering a new field—or filling gaps in their
              knowledge—this creates an invisible barrier. You're constantly pausing to look things up,
              losing the thread of the argument.
            </p>
            <p className="text-lg text-ink-500 leading-relaxed mt-4">
              <span className="text-ink-700 font-medium">Scholar changes this.</span> It identifies
              what you need to know based on what you already know, adding explanations exactly
              where you need them.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-serif text-ink-700 text-center mb-12"
          >
            How Scholar Works
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-paper-50 rounded-xl shadow-paper border border-paper-200 p-6"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium text-ink-700 mb-2">{feature.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="px-6 py-16 bg-ink-800 text-paper-50">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-serif text-center mb-12"
          >
            Your Reading Journey
          </motion.h2>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Build Your Knowledge Profile',
                description: 'During onboarding, tell Scholar about your academic background, the books you\'ve read, and the thinkers you\'re familiar with. This isn\'t a quiz—just share what you know.',
              },
              {
                step: '02',
                title: 'Upload Your Book',
                description: 'Add any EPUB to your library. Scholar analyzes the text, identifies references and concepts, and cross-references them against your knowledge profile.',
              },
              {
                step: '03',
                title: 'See Prerequisites',
                description: 'Before you start reading, Scholar shows you what background knowledge would help. You can read suggested primers or dive in—the annotations will catch what you miss.',
              },
              {
                step: '04',
                title: 'Read with AI Assistance',
                description: 'Annotations appear exactly where you need them. Select any passage to ask questions. Scholar answers using the book\'s content, not generic AI responses.',
              },
              {
                step: '05',
                title: 'Your Knowledge Grows',
                description: 'As you read, Scholar updates your profile. Concepts you\'ve now learned won\'t be re-explained in future books. Your reading gets faster and deeper.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-6"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-paper-50/10 flex items-center justify-center text-accent font-mono text-sm">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                  <p className="text-paper-300 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-serif text-ink-700 text-center mb-4"
          >
            Built for Every Reader
          </motion.h2>
          <p className="text-center text-ink-500 mb-12 max-w-2xl mx-auto">
            Whether you're a student, researcher, or curious autodidact, Scholar adapts to your needs.
          </p>

          <div className="space-y-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.persona}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-paper-50 rounded-xl shadow-paper border border-paper-200 p-6 md:p-8"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                  <div className="md:w-1/3">
                    <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-sm rounded-full mb-2">
                      {useCase.persona}
                    </span>
                    <p className="text-ink-600 text-sm">{useCase.scenario}</p>
                  </div>
                  <div className="md:w-2/3 md:border-l md:border-paper-200 md:pl-8">
                    <p className="text-ink-700 leading-relaxed">{useCase.solution}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="px-6 py-16 bg-paper-100/50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-serif text-ink-700 mb-6">
              Powered by Modern AI
            </h2>
            <p className="text-ink-500 leading-relaxed mb-8">
              Scholar uses retrieval-augmented generation (RAG) to ground all responses in the
              actual text. When you ask a question, we search the book's content using vector
              embeddings and feed relevant passages to the AI. This means answers are specific
              to what you're reading—not generic summaries.
            </p>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4">
                <div className="text-2xl font-serif text-accent mb-1">RAG</div>
                <div className="text-xs text-ink-400">Retrieval-Augmented Generation</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-serif text-accent mb-1">GPT-4</div>
                <div className="text-xs text-ink-400">Advanced Language Model</div>
              </div>
              <div className="p-4">
                <div className="text-2xl font-serif text-accent mb-1">Vector DB</div>
                <div className="text-xs text-ink-400">Semantic Search</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-serif text-ink-700 mb-6">
              Simple Pricing
            </h2>
            <div className="bg-paper-50 rounded-2xl shadow-paper border border-paper-200 p-8">
              <div className="text-5xl font-serif text-ink-800 mb-2">$15<span className="text-xl text-ink-400">/mo</span></div>
              <p className="text-ink-500 mb-6">Process up to 10 books per month</p>
              <ul className="text-left space-y-3 mb-8">
                {[
                  'Unlimited AI chat queries',
                  'Personalized annotations',
                  'Mobile e-reader access',
                  'Highlight & note sync',
                  'Zotero export',
                  'Knowledge profile',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-ink-600">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-400 italic">
                Early waitlist members will receive a discount at launch
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 bg-gradient-to-b from-ink-800 to-ink-900 text-paper-50">
        <div className="max-w-xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-serif mb-4">
              Stop looking things up. Start understanding.
            </h2>
            <p className="text-paper-300 mb-8">
              Join the waitlist and be first to experience reading with Scholar.
            </p>
            <WaitlistForm />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-paper-200 bg-paper-50">
        <div className="flex justify-center gap-6 text-sm text-ink-400 mb-4">
          <Link href="/" className="hover:text-ink-600 transition-colors">Home</Link>
          <Link href="/about" className="hover:text-ink-600 transition-colors">About</Link>
          <Link href="/scholar" className="hover:text-ink-600 transition-colors">Scholar</Link>
        </div>
        <p className="text-xs text-ink-300">
          WikiRead — Making academic texts accessible
        </p>
      </footer>
    </div>
  )
}
