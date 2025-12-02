# WikiRead Scholar - Frontend Components Specification

React/Next.js components for the Scholar e-reader experience.

## Core Dependencies

```bash
npm install epubjs @supabase/supabase-js framer-motion lucide-react
```

## Component Architecture

```
src/
  components/
    reader/
      EpubReader.tsx        # Main e-reader wrapper
      ReaderToolbar.tsx     # Top toolbar with navigation
      SelectionPopover.tsx  # Appears on text selection
      AnnotationMarker.tsx  # Inline annotation markers
      ChapterNav.tsx        # Chapter navigation sidebar
    chat/
      ChatSidebar.tsx       # AI chat panel
      ChatMessage.tsx       # Individual message
      ChatInput.tsx         # Input with suggestions
    annotations/
      AnnotationPanel.tsx   # List of annotations
      AnnotationCard.tsx    # Single annotation
      HighlightList.tsx     # User highlights
    onboarding/
      KnowledgeProfileForm.tsx
      BookHistoryInput.tsx
    export/
      ExportModal.tsx
```

## Key Components

### 1. EpubReader.tsx

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import ePub, { Book, Rendition, Contents } from 'epubjs'
import { SelectionPopover } from './SelectionPopover'
import { AnnotationMarker } from './AnnotationMarker'
import { ReaderToolbar } from './ReaderToolbar'
import { ChatSidebar } from '../chat/ChatSidebar'

interface EpubReaderProps {
  bookUrl: string
  bookId: string
  userId: string
  initialPosition?: string
  annotations?: Annotation[]
}

export function EpubReader({
  bookUrl,
  bookId,
  userId,
  initialPosition,
  annotations = []
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)

  const [currentChapter, setCurrentChapter] = useState(1)
  const [progress, setProgress] = useState(0)
  const [selection, setSelection] = useState<{
    text: string
    cfiRange: string
    position: { x: number; y: number }
  } | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatContext, setChatContext] = useState<string | null>(null)

  // Initialize epub.js
  useEffect(() => {
    if (!viewerRef.current) return

    const book = ePub(bookUrl)
    bookRef.current = book

    const rendition = book.renderTo(viewerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none',
      flow: 'paginated'
    })

    renditionRef.current = rendition

    // Apply custom styles
    rendition.themes.default({
      body: {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        lineHeight: '1.8',
        color: '#2a211a',
        backgroundColor: '#fdfcfa'
      },
      'p': { marginBottom: '1em' },
      'h1, h2, h3': { fontFamily: 'system-ui, sans-serif' }
    })

    // Display book
    if (initialPosition) {
      rendition.display(initialPosition)
    } else {
      rendition.display()
    }

    // Track location changes
    rendition.on('locationChanged', (location: any) => {
      const currentPage = book.locations.percentageFromCfi(location.start.cfi)
      setProgress(currentPage)

      // Save position to database
      saveReadingProgress(bookId, userId, location.start.cfi, currentPage)
    })

    // Handle text selection
    rendition.on('selected', (cfiRange: string, contents: Contents) => {
      const selectedText = rendition.getRange(cfiRange).toString()
      if (selectedText.length < 5) return

      const range = rendition.getRange(cfiRange)
      const rect = range.getBoundingClientRect()

      setSelection({
        text: selectedText,
        cfiRange,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top
        }
      })
    })

    // Clear selection when clicking elsewhere
    rendition.on('click', () => {
      setSelection(null)
    })

    // Generate locations for progress tracking
    book.ready.then(() => {
      return book.locations.generate(1024)
    })

    return () => {
      book.destroy()
    }
  }, [bookUrl, bookId, userId, initialPosition])

  // Inject annotation markers into rendered content
  useEffect(() => {
    if (!renditionRef.current || !annotations.length) return

    renditionRef.current.hooks.content.register((contents: Contents) => {
      const document = contents.document

      annotations.forEach(annotation => {
        // Find and mark annotation terms in the text
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        )

        let node
        while (node = walker.nextNode()) {
          if (node.textContent?.includes(annotation.term)) {
            // Insert annotation marker
            const span = document.createElement('span')
            span.className = 'wikiread-annotation'
            span.dataset.annotationId = annotation.id
            span.innerHTML = node.textContent.replace(
              annotation.term,
              `<mark class="annotation-highlight">${annotation.term}<sup class="annotation-icon">i</sup></mark>`
            )
            node.parentNode?.replaceChild(span, node)
          }
        }
      })
    })
  }, [annotations])

  const handleAskAboutSelection = useCallback(() => {
    if (selection) {
      setChatContext(selection.text)
      setShowChat(true)
      setSelection(null)
    }
  }, [selection])

  const handleHighlight = useCallback(async (color: string) => {
    if (!selection || !renditionRef.current) return

    // Add visual highlight
    renditionRef.current.annotations.highlight(
      selection.cfiRange,
      {},
      () => {},
      'highlight-' + color,
      { fill: color, 'fill-opacity': '0.3' }
    )

    // Save to database
    await saveHighlight(bookId, userId, {
      text: selection.text,
      cfiRange: selection.cfiRange,
      color,
      chapterNumber: currentChapter
    })

    setSelection(null)
  }, [selection, bookId, userId, currentChapter])

  const goToNext = () => renditionRef.current?.next()
  const goToPrev = () => renditionRef.current?.prev()

  return (
    <div className="flex h-screen bg-paper-50">
      {/* Main reader area */}
      <div className="flex-1 flex flex-col">
        <ReaderToolbar
          progress={progress}
          currentChapter={currentChapter}
          onToggleChat={() => setShowChat(!showChat)}
          onGoToChapter={(n) => {/* nav logic */}}
        />

        <div
          ref={viewerRef}
          className="flex-1 relative overflow-hidden"
          style={{ touchAction: 'pan-x pan-y' }}
        />

        {/* Navigation arrows */}
        <div className="absolute inset-y-0 left-0 w-1/4 cursor-pointer" onClick={goToPrev} />
        <div className="absolute inset-y-0 right-0 w-1/4 cursor-pointer" onClick={goToNext} />

        {/* Selection popover */}
        {selection && (
          <SelectionPopover
            position={selection.position}
            onAsk={handleAskAboutSelection}
            onHighlight={handleHighlight}
            onClose={() => setSelection(null)}
          />
        )}
      </div>

      {/* Chat sidebar */}
      {showChat && (
        <ChatSidebar
          bookId={bookId}
          userId={userId}
          initialContext={chatContext}
          onClose={() => {
            setShowChat(false)
            setChatContext(null)
          }}
        />
      )}
    </div>
  )
}

// Helper functions
async function saveReadingProgress(
  bookId: string,
  userId: string,
  position: string,
  progress: number
) {
  await fetch('/api/reading-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, userId, position, progress })
  })
}

async function saveHighlight(
  bookId: string,
  userId: string,
  highlight: { text: string; cfiRange: string; color: string; chapterNumber: number }
) {
  await fetch('/api/highlights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, userId, ...highlight })
  })
}
```

### 2. SelectionPopover.tsx

```tsx
'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Highlighter, X } from 'lucide-react'

interface SelectionPopoverProps {
  position: { x: number; y: number }
  onAsk: () => void
  onHighlight: (color: string) => void
  onClose: () => void
}

const highlightColors = [
  { name: 'yellow', value: '#fef08a' },
  { name: 'green', value: '#86efac' },
  { name: 'blue', value: '#93c5fd' },
  { name: 'pink', value: '#f9a8d4' },
  { name: 'orange', value: '#fdba74' }
]

export function SelectionPopover({
  position,
  onAsk,
  onHighlight,
  onClose
}: SelectionPopoverProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-paper-200 p-2"
      style={{
        left: position.x,
        top: position.y - 60,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-center gap-2">
        {/* Ask AI button */}
        <button
          onClick={onAsk}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-dark transition-colors text-sm font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          Ask
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-paper-200" />

        {/* Highlight colors */}
        <div className="flex items-center gap-1">
          {highlightColors.map(color => (
            <button
              key={color.name}
              onClick={() => onHighlight(color.name)}
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
              style={{ backgroundColor: color.value }}
              title={`Highlight ${color.name}`}
            />
          ))}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 text-paper-400 hover:text-paper-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}
```

### 3. ChatSidebar.tsx

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, X, Loader2, BookOpen } from 'lucide-react'
import { ChatMessage } from './ChatMessage'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: {
    chapters_referenced: string[]
    passages_used: number
  }
}

interface ChatSidebarProps {
  bookId: string
  userId: string
  initialContext?: string | null
  onClose: () => void
}

export function ChatSidebar({
  bookId,
  userId,
  initialContext,
  onClose
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // If opened with selected text, pre-populate
  useEffect(() => {
    if (initialContext) {
      setInput(`What does this passage mean: "${initialContext.slice(0, 200)}${initialContext.length > 200 ? '...' : ''}"`)
    }
  }, [initialContext])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_CHAT_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          user_id: userId,
          query: input,
          selected_text: initialContext,
          chat_history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        sources: data.sources
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-96 border-l border-paper-200 bg-white flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-paper-200">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <h2 className="font-semibold text-ink-900">Ask about this book</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-paper-400 hover:text-paper-600 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-paper-500 py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Ask me anything about this book.</p>
            <p className="text-sm mt-1">
              I'll answer based on the book's content.
            </p>
          </div>
        )}

        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-paper-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-paper-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border border-paper-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}
```

### 4. KnowledgeProfileForm.tsx (Onboarding)

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, BookOpen, GraduationCap, Brain } from 'lucide-react'

interface KnowledgeProfileFormProps {
  onComplete: (profile: KnowledgeProfile) => void
}

interface KnowledgeProfile {
  academicLevel: string
  fieldsOfStudy: string[]
  booksRead: string[]
  knownAuthors: string[]
  knownConcepts: string[]
}

const academicLevels = [
  { id: 'high_school', label: 'High School', description: 'General education' },
  { id: 'undergraduate', label: 'Undergraduate', description: 'Working on bachelor\'s degree' },
  { id: 'graduate', label: 'Graduate', description: 'Master\'s or PhD student' },
  { id: 'postgraduate', label: 'Postgraduate', description: 'Completed advanced degree' },
  { id: 'professional', label: 'Professional', description: 'Industry expert' }
]

const fieldSuggestions = [
  'Philosophy', 'History', 'Literature', 'Psychology', 'Sociology',
  'Political Science', 'Economics', 'Anthropology', 'Art History',
  'Religious Studies', 'Classics', 'Linguistics', 'Law', 'Medicine',
  'Computer Science', 'Physics', 'Biology', 'Mathematics'
]

export function KnowledgeProfileForm({ onComplete }: KnowledgeProfileFormProps) {
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<KnowledgeProfile>({
    academicLevel: '',
    fieldsOfStudy: [],
    booksRead: [],
    knownAuthors: [],
    knownConcepts: []
  })

  const [bookInput, setBookInput] = useState('')
  const [authorInput, setAuthorInput] = useState('')

  const handleNext = () => setStep(s => Math.min(s + 1, 4))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const handleComplete = async () => {
    // Save to database
    await fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    })
    onComplete(profile)
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${step >= i ? 'bg-accent text-white' : 'bg-paper-100 text-paper-400'}
            `}>
              {i}
            </div>
            {i < 4 && (
              <div className={`w-12 h-0.5 ${step > i ? 'bg-accent' : 'bg-paper-200'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap className="w-8 h-8 text-accent" />
              <h2 className="text-2xl font-semibold">What's your academic level?</h2>
            </div>
            <p className="text-paper-600 mb-6">
              This helps us calibrate explanations to your background.
            </p>

            <div className="space-y-3">
              {academicLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => setProfile(p => ({ ...p, academicLevel: level.id }))}
                  className={`
                    w-full p-4 rounded-lg border-2 text-left transition-all
                    ${profile.academicLevel === level.id
                      ? 'border-accent bg-accent/5'
                      : 'border-paper-200 hover:border-paper-300'}
                  `}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className="text-sm text-paper-500">{level.description}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Brain className="w-8 h-8 text-accent" />
              <h2 className="text-2xl font-semibold">What do you study or work in?</h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {fieldSuggestions.map(field => (
                <button
                  key={field}
                  onClick={() => {
                    setProfile(p => ({
                      ...p,
                      fieldsOfStudy: p.fieldsOfStudy.includes(field)
                        ? p.fieldsOfStudy.filter(f => f !== field)
                        : [...p.fieldsOfStudy, field]
                    }))
                  }}
                  className={`
                    px-3 py-1.5 rounded-full text-sm transition-all
                    ${profile.fieldsOfStudy.includes(field)
                      ? 'bg-accent text-white'
                      : 'bg-paper-100 text-paper-700 hover:bg-paper-200'}
                  `}
                >
                  {field}
                </button>
              ))}
            </div>

            <p className="text-sm text-paper-500">
              Selected: {profile.fieldsOfStudy.length || 'None'}
            </p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-8 h-8 text-accent" />
              <h2 className="text-2xl font-semibold">What books have you read?</h2>
            </div>
            <p className="text-paper-600 mb-6">
              List foundational texts you're familiar with. We won't re-explain concepts you already know.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={bookInput}
                onChange={(e) => setBookInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && bookInput.trim()) {
                    setProfile(p => ({
                      ...p,
                      booksRead: [...p.booksRead, bookInput.trim()]
                    }))
                    setBookInput('')
                  }
                }}
                placeholder="Enter a book title and press Enter"
                className="flex-1 px-4 py-2 border border-paper-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.booksRead.map((book, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-paper-100 rounded-full text-sm flex items-center gap-2"
                >
                  {book}
                  <button
                    onClick={() => setProfile(p => ({
                      ...p,
                      booksRead: p.booksRead.filter((_, j) => j !== i)
                    }))}
                    className="text-paper-400 hover:text-paper-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <h2 className="text-2xl font-semibold mb-6">Which thinkers are you familiar with?</h2>
            <p className="text-paper-600 mb-6">
              Authors, philosophers, scientists whose work you know.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && authorInput.trim()) {
                    setProfile(p => ({
                      ...p,
                      knownAuthors: [...p.knownAuthors, authorInput.trim()]
                    }))
                    setAuthorInput('')
                  }
                }}
                placeholder="Enter a name and press Enter"
                className="flex-1 px-4 py-2 border border-paper-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {profile.knownAuthors.map((author, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-paper-100 rounded-full text-sm flex items-center gap-2"
                >
                  {author}
                  <button
                    onClick={() => setProfile(p => ({
                      ...p,
                      knownAuthors: p.knownAuthors.filter((_, j) => j !== i)
                    }))}
                    className="text-paper-400 hover:text-paper-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-paper-200">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 text-paper-600 hover:text-paper-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={step === 1 && !profile.academicLevel}
            className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark"
          >
            Complete Setup
          </button>
        )}
      </div>
    </div>
  )
}
```

### 5. ExportModal.tsx

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, FileText, FileJson, FileCode, Loader2 } from 'lucide-react'

interface ExportModalProps {
  bookId: string
  userId: string
  bookTitle: string
  onClose: () => void
}

const exportFormats = [
  { id: 'rdf', label: 'Zotero RDF', icon: FileCode, description: 'Import directly into Zotero' },
  { id: 'json', label: 'Zotero JSON', icon: FileJson, description: 'Zotero JSON format' },
  { id: 'markdown', label: 'Markdown', icon: FileText, description: 'Human-readable markdown' }
]

export function ExportModal({ bookId, userId, bookTitle, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!selectedFormat) return

    setIsExporting(true)

    try {
      const response = await fetch(process.env.NEXT_PUBLIC_N8N_EXPORT_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          user_id: userId,
          format: selectedFormat
        })
      })

      const data = await response.json()

      // Create and trigger download
      const blob = new Blob([data.content], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      onClose()
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Export Annotations</h2>
          <button onClick={onClose} className="text-paper-400 hover:text-paper-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-paper-600 mb-6">
          Export your annotations and highlights for "{bookTitle}"
        </p>

        <div className="space-y-3 mb-6">
          {exportFormats.map(format => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left flex items-center gap-4 transition-all
                ${selectedFormat === format.id
                  ? 'border-accent bg-accent/5'
                  : 'border-paper-200 hover:border-paper-300'}
              `}
            >
              <format.icon className={`w-6 h-6 ${selectedFormat === format.id ? 'text-accent' : 'text-paper-400'}`} />
              <div>
                <div className="font-medium">{format.label}</div>
                <div className="text-sm text-paper-500">{format.description}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleExport}
          disabled={!selectedFormat || isExporting}
          className="w-full py-3 bg-accent text-white rounded-lg hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  )
}
```

## API Routes

### /api/reading-progress/route.ts

```tsx
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { bookId, userId, position, progress } = await request.json()

  const { error } = await supabase
    .from('user_books')
    .upsert({
      user_id: userId,
      book_id: bookId,
      current_position: position,
      reading_progress: progress,
      last_read_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,book_id'
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### /api/highlights/route.ts

```tsx
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { bookId, userId, text, cfiRange, color, chapterNumber } = await request.json()

  const { data, error } = await supabase
    .from('highlights')
    .insert({
      book_id: bookId,
      user_id: userId,
      text,
      cfi_range: cfiRange,
      color,
      chapter_number: chapterNumber
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

## Mobile Considerations

For the mobile e-reader experience:

1. **Touch Gestures**
   - Swipe left/right to turn pages
   - Long press to select text
   - Pinch to zoom (optional)

2. **Responsive Layout**
   - Chat sidebar becomes full-screen modal on mobile
   - Selection popover appears above selected text
   - Bottom sheet for chapter navigation

3. **Progressive Web App**
   - Add to home screen capability
   - Offline reading with cached books
   - Background sync for annotations

```tsx
// Add to next.config.js for PWA support
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA({
  // your config
})
```
