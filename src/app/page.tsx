'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { processEpub, canConvert, incrementUsage, getRemainingConversions } from '@/lib/epub-processor'

type ProcessingState = 'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'limit-reached'

interface ProcessingResult {
  blob: Blob
  filename: string
  stats: {
    linksAdded: number
    footnotesProcessed: number
    termsFound: string[]
  }
}

// Waitlist component
function ScholarWaitlist() {
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="mt-24 mb-16"
    >
      <div className="max-w-2xl mx-auto">
        {/* Divider */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-paper-300 to-transparent" />
          <span className="text-xs text-paper-400 uppercase tracking-widest font-medium">Coming Soon</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-paper-300 to-transparent" />
        </div>

        {/* Scholar Announcement */}
        <div className="bg-paper-50 rounded-xl shadow-paper overflow-hidden border border-paper-200">
          {/* Header */}
          <div className="bg-gradient-to-br from-ink-700 to-ink-800 text-paper-50 p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-paper-50/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-serif mb-2">WikiRead Scholar</h2>
                <p className="text-paper-200 text-sm leading-relaxed">
                  AI-powered reading companion for dense academic texts
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-10">
            <p className="text-ink-600 leading-relaxed mb-6">
              Reading Nick Land but haven't read Deleuze? Scholar identifies what you need to know
              and adds personalized explanations directly in your text. Your knowledge profile
              grows with each book, so annotations become smarter over time.
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 p-4 bg-paper-100 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink-700 mb-1">Personalized Annotations</h3>
                  <p className="text-xs text-ink-400">Explanations tailored to your existing knowledge</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-paper-100 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink-700 mb-1">Chat With Your Text</h3>
                  <p className="text-xs text-ink-400">Ask questions, get answers with page citations</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-paper-100 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink-700 mb-1">Prerequisite Detection</h3>
                  <p className="text-xs text-ink-400">Know what to read before you dive in</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-paper-100 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-accent">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink-700 mb-1">Download Enriched EPUB</h3>
                  <p className="text-xs text-ink-400">Your personalized book, readable anywhere</p>
                </div>
              </div>
            </div>

            {/* Waitlist Form */}
            <div className="border-t border-paper-200 pt-6">
              <p className="text-xs text-ink-400 mb-4 uppercase tracking-wide">
                Join the waitlist for early access
              </p>

              {status === 'success' ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-lg"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">You're on the list. We'll be in touch.</span>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 bg-paper-100 border border-paper-300 rounded-lg text-sm text-ink-700 placeholder-ink-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="px-6 py-3 bg-ink-700 hover:bg-ink-800 text-paper-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </form>
              )}

              {status === 'error' && (
                <p className="mt-3 text-sm text-red-600">Something went wrong. Please try again.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default function Home() {
  const [state, setState] = useState<ProcessingState>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remainingConversions, setRemainingConversions] = useState(1)

  useEffect(() => {
    setRemainingConversions(getRemainingConversions())
  }, [])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const processFile = useCallback(async (file: File) => {
    const fileName = file.name.toLowerCase()

    if (!fileName.endsWith('.epub')) {
      setError('Please upload an EPUB file. PDF support coming soon.')
      setState('error')
      return
    }

    if (!canConvert()) {
      setState('limit-reached')
      return
    }

    setState('processing')
    setError(null)

    try {
      const result = await processEpub(file)

      if (result.success && result.epub && result.filename && result.stats) {
        incrementUsage()
        setRemainingConversions(getRemainingConversions())
        setResult({
          blob: result.epub,
          filename: result.filename,
          stats: result.stats,
        })
        setState('success')
      } else {
        setError(result.error || 'Processing failed.')
        setState('error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setState('error')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }, [processFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }, [processFile])

  const handleDownload = useCallback(() => {
    if (!result) return

    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [result])

  const handleReset = useCallback(() => {
    setState('idle')
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="min-h-screen paper-texture paper-grain">
      {/* Header */}
      <header className="pt-12 pb-8 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-serif font-normal text-ink-800 tracking-tight text-emboss">
              WikiRead
            </h1>
            <p className="mt-3 text-lg text-ink-500 font-light">
              Add Wikipedia links to your EPUB footnotes
            </p>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-8">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Idle State - Upload Zone */}
            {state === 'idle' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  className={`
                    drop-zone relative rounded-lg border-2 border-dashed bg-paper-50
                    ${dragActive
                      ? 'border-accent bg-accent/5'
                      : 'border-paper-400 hover:border-paper-500'
                    }
                    transition-all duration-300 cursor-pointer shadow-paper
                  `}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <label className="block p-12 md:p-16 cursor-pointer">
                    <input
                      type="file"
                      accept=".epub"
                      onChange={handleFileInput}
                      className="sr-only"
                    />
                    <div className="text-center">
                      {/* Book Icon */}
                      <div className="mx-auto w-16 h-16 mb-6 text-paper-500">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>

                      <p className="text-lg font-serif text-ink-600 mb-2">
                        Drop your EPUB here
                      </p>
                      <p className="text-sm text-ink-400">
                        or click to browse
                      </p>
                    </div>
                  </label>
                </div>

                {/* Usage indicator */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-ink-400">
                    {remainingConversions > 0 ? (
                      <>
                        <span className="text-ink-500 font-medium">{remainingConversions}</span>
                        {' '}free conversion{remainingConversions !== 1 ? 's' : ''} remaining
                      </>
                    ) : (
                      <span className="text-accent">Free limit reached</span>
                    )}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Processing State */}
            {state === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-paper-50 rounded-lg shadow-paper p-12 text-center"
              >
                {/* Animated Book */}
                <div className="mx-auto w-20 h-20 mb-6 relative">
                  <motion.div
                    animate={{ rotateY: [0, 180, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full text-accent">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </motion.div>
                </div>

                <h2 className="text-xl font-serif text-ink-700 mb-2">
                  Processing your EPUB
                </h2>
                <p className="text-sm text-ink-400">
                  Scanning footnotes and adding Wikipedia links...
                </p>

                {/* Progress indicator */}
                <div className="mt-6 h-1 bg-paper-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Success State */}
            {state === 'success' && result && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-paper-50 rounded-lg shadow-paper overflow-hidden"
              >
                {/* Success Header */}
                <div className="bg-gradient-to-b from-paper-100 to-paper-50 p-8 text-center border-b border-paper-200">
                  <div className="mx-auto w-14 h-14 mb-4 text-green-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-serif text-ink-700">
                    Processing Complete
                  </h2>
                </div>

                {/* Stats */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-paper-100 rounded-lg p-4 text-center">
                      <p className="text-2xl font-serif text-accent">{result.stats.linksAdded}</p>
                      <p className="text-xs text-ink-400 mt-1">Links Added</p>
                    </div>
                    <div className="bg-paper-100 rounded-lg p-4 text-center">
                      <p className="text-2xl font-serif text-accent">{result.stats.footnotesProcessed}</p>
                      <p className="text-xs text-ink-400 mt-1">Footnotes Scanned</p>
                    </div>
                  </div>

                  {/* Terms Found */}
                  {result.stats.termsFound.length > 0 && (
                    <div className="bg-paper-100 rounded-lg p-4">
                      <p className="text-xs text-ink-400 mb-2">Terms Found:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.stats.termsFound.slice(0, 10).map((term, i) => (
                          <span
                            key={i}
                            className="inline-block px-2 py-0.5 bg-paper-200 text-ink-600 text-xs rounded"
                          >
                            {term}
                          </span>
                        ))}
                        {result.stats.termsFound.length > 10 && (
                          <span className="inline-block px-2 py-0.5 text-ink-400 text-xs">
                            +{result.stats.termsFound.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-6 pt-0 space-y-3">
                  <button
                    onClick={handleDownload}
                    className="w-full btn-press bg-accent hover:bg-accent-dark text-white py-3 px-6 rounded-lg font-medium transition-colors shadow-paper focus-ring"
                  >
                    Download EPUB
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full text-sm text-ink-400 hover:text-ink-600 py-2 transition-colors"
                  >
                    Process another file
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {state === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-paper-50 rounded-lg shadow-paper p-8 text-center"
              >
                <div className="mx-auto w-14 h-14 mb-4 text-red-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-xl font-serif text-ink-700 mb-2">
                  Something went wrong
                </h2>
                <p className="text-sm text-ink-400 mb-6">
                  {error || 'An unexpected error occurred.'}
                </p>
                <button
                  onClick={handleReset}
                  className="btn-press bg-paper-200 hover:bg-paper-300 text-ink-600 py-2 px-6 rounded-lg font-medium transition-colors focus-ring"
                >
                  Try again
                </button>
              </motion.div>
            )}

            {/* Limit Reached State */}
            {state === 'limit-reached' && (
              <motion.div
                key="limit"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-paper-50 rounded-lg shadow-paper p-8 text-center"
              >
                <div className="mx-auto w-14 h-14 mb-4 text-accent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h2 className="text-xl font-serif text-ink-700 mb-2">
                  Free Limit Reached
                </h2>
                <p className="text-sm text-ink-400 mb-6">
                  You've used your free conversion. Upgrade to continue processing EPUBs.
                </p>
                <div className="space-y-3">
                  <button
                    className="w-full btn-press bg-accent hover:bg-accent-dark text-white py-3 px-6 rounded-lg font-medium transition-colors shadow-paper focus-ring"
                  >
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={handleReset}
                    className="w-full text-sm text-ink-400 hover:text-ink-600 py-2 transition-colors"
                  >
                    Go back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Feature List */}
        {state === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="max-w-xl mx-auto mt-12"
          >
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto w-10 h-10 mb-3 text-paper-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-ink-600 mb-1">Scan Footnotes</h3>
                <p className="text-xs text-ink-400">Automatically finds all footnotes in your EPUB</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-10 h-10 mb-3 text-paper-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-ink-600 mb-1">Extract Terms</h3>
                <p className="text-xs text-ink-400">Identifies names, titles, and concepts</p>
              </div>
              <div className="text-center">
                <div className="mx-auto w-10 h-10 mb-3 text-paper-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-ink-600 mb-1">Add Links</h3>
                <p className="text-xs text-ink-400">Inserts Wikipedia links next to footnotes</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scholar Waitlist - Only show on idle */}
        {state === 'idle' && <ScholarWaitlist />}
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-paper-200 bg-paper-50">
        <p className="text-xs text-ink-300">
          Perfect for philosophy, history, and academic texts
        </p>
      </footer>
    </div>
  )
}
