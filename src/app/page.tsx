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
    if (!file.name.toLowerCase().endsWith('.epub')) {
      setError('Please upload an EPUB file.')
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
      <main className="px-6 pb-16">
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
                    drop-zone relative rounded-lg border-2 border-dashed
                    ${dragActive
                      ? 'border-accent bg-accent/5'
                      : 'border-paper-400 hover:border-paper-500'
                    }
                    transition-all duration-300 cursor-pointer
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
            className="max-w-xl mx-auto mt-16"
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
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-4 px-6 text-center bg-gradient-to-t from-paper-100 to-transparent">
        <p className="text-xs text-ink-300">
          Perfect for philosophy, history, and academic texts
        </p>
      </footer>
    </div>
  )
}
