import JSZip from 'jszip'

// Known terms database - philosophy, history, and academic terms
const KNOWN_TERMS = new Set([
  // Philosophers
  'Plato', 'Aristotle', 'Socrates', 'Descartes', 'Kant', 'Hegel', 'Nietzsche',
  'Heidegger', 'Wittgenstein', 'Sartre', 'Camus', 'Kierkegaard', 'Spinoza',
  'Leibniz', 'Locke', 'Hume', 'Berkeley', 'Rousseau', 'Voltaire', 'Montesquieu',
  'Marx', 'Engels', 'Foucault', 'Derrida', 'Deleuze', 'Husserl', 'Merleau-Ponty',
  'Simone de Beauvoir', 'Hannah Arendt', 'John Rawls', 'Robert Nozick',
  'Thomas Aquinas', 'Augustine', 'Seneca', 'Marcus Aurelius', 'Epictetus',
  'Epicurus', 'Zeno', 'Parmenides', 'Heraclitus', 'Pythagoras', 'Thales',
  'Anaximander', 'Empedocles', 'Democritus', 'Protagoras', 'Gorgias',

  // Concepts
  'Dialectic', 'Metaphysics', 'Epistemology', 'Ontology', 'Phenomenology',
  'Existentialism', 'Nihilism', 'Stoicism', 'Epicureanism', 'Skepticism',
  'Rationalism', 'Empiricism', 'Idealism', 'Materialism', 'Dualism',
  'Pragmatism', 'Utilitarianism', 'Deontology', 'Virtue Ethics', 'Aesthetics',
  'Hermeneutics', 'Structuralism', 'Post-structuralism', 'Deconstruction',
  'Categorical Imperative', 'Social Contract', 'State of Nature',
  'Allegory of the Cave', 'Theory of Forms', 'Cogito', 'Dasein', 'Being-in-the-world',
  'Will to Power', 'Eternal Recurrence', 'Übermensch', 'Bad Faith', 'Absurdism',

  // Historical figures
  'Napoleon', 'Caesar', 'Alexander the Great', 'Charlemagne', 'Constantine',
  'Machiavelli', 'Hobbes', 'Adam Smith', 'John Stuart Mill', 'Edmund Burke',
  'Thomas Jefferson', 'Benjamin Franklin', 'Abraham Lincoln', 'Churchill',
  'Gandhi', 'Martin Luther', 'Calvin', 'Erasmus', 'Thomas More', 'Bacon',

  // Works
  'Republic', 'Nicomachean Ethics', 'Politics', 'Meditations', 'Critique of Pure Reason',
  'Phenomenology of Spirit', 'Being and Time', 'Being and Nothingness',
  'The Prince', 'Leviathan', 'Two Treatises of Government', 'The Wealth of Nations',
  'Communist Manifesto', 'Das Kapital', 'On Liberty', 'A Theory of Justice',

  // Movements and periods
  'Renaissance', 'Enlightenment', 'Reformation', 'Counter-Reformation',
  'Industrial Revolution', 'French Revolution', 'Scientific Revolution',
  'Romanticism', 'Modernism', 'Postmodernism', 'Classical Antiquity',
  'Medieval Period', 'Middle Ages', 'Ancient Greece', 'Roman Empire',
  'Byzantine Empire', 'Holy Roman Empire', 'Ottoman Empire',
])

interface ProcessingResult {
  success: boolean
  epub?: Blob
  filename?: string
  stats?: {
    linksAdded: number
    footnotesProcessed: number
    termsFound: string[]
  }
  error?: string
}

interface FootnoteMatch {
  id: string
  content: string
  terms: string[]
}

// Extract terms from footnote text
function extractTerms(text: string): string[] {
  const terms: string[] = []
  const seen = new Set<string>()

  // Check for known terms
  for (const term of KNOWN_TERMS) {
    if (text.includes(term) && !seen.has(term.toLowerCase())) {
      terms.push(term)
      seen.add(term.toLowerCase())
    }
  }

  // Extract capitalized name patterns (e.g., "John Locke")
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g
  let match
  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1]
    if (!seen.has(name.toLowerCase()) && !isCommonPhrase(name)) {
      terms.push(name)
      seen.add(name.toLowerCase())
    }
  }

  // Extract quoted titles
  const quotePattern = /[""]([^""]+)[""]/g
  while ((match = quotePattern.exec(text)) !== null) {
    const title = match[1]
    if (title.length > 3 && title.length < 100 && !seen.has(title.toLowerCase())) {
      terms.push(title)
      seen.add(title.toLowerCase())
    }
  }

  return terms
}

// Filter out common phrases that aren't Wikipedia-worthy
function isCommonPhrase(phrase: string): boolean {
  const common = [
    'The', 'This', 'That', 'These', 'Those', 'Such', 'Much', 'Many',
    'New York', 'New Jersey', 'New England', 'New Orleans',
    'United States', 'United Kingdom', 'United Nations',
  ]
  return common.includes(phrase) || phrase.split(' ').length > 5
}

// Generate Wikipedia URL for a term
function getWikipediaUrl(term: string): string {
  const encoded = encodeURIComponent(term.replace(/ /g, '_'))
  return `https://en.wikipedia.org/wiki/${encoded}`
}

// Parse HTML content and find footnotes
function findFootnotes(html: string): FootnoteMatch[] {
  const footnotes: FootnoteMatch[] = []

  // Patterns for footnote containers
  const patterns = [
    // ID-based patterns
    /id=["'](?:footnote|fn|note|endnote)[_-]?(\d+)["'][^>]*>([\s\S]*?)<\/(?:div|p|li|aside|section)/gi,
    // Class-based patterns
    /class=["'][^"']*(?:footnote|endnote|note-text)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|li|aside|section)/gi,
    // Epub-type patterns
    /epub:type=["'](?:footnote|endnote|note)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|li|aside|section)/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1] || `note_${footnotes.length}`
      const content = match[2] || match[1]

      // Strip HTML tags to get plain text
      const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

      if (plainText.length > 10) {
        const terms = extractTerms(plainText)
        if (terms.length > 0) {
          footnotes.push({ id, content: plainText, terms })
        }
      }
    }
  }

  return footnotes
}

// Add Wikipedia links to footnote references in the main text
function addWikiLinks(html: string, footnotes: FootnoteMatch[]): { html: string; linksAdded: number } {
  let modified = html
  let linksAdded = 0

  for (const footnote of footnotes) {
    if (footnote.terms.length === 0) continue

    // Use the first/most relevant term
    const primaryTerm = footnote.terms[0]
    const wikiUrl = getWikipediaUrl(primaryTerm)

    // Pattern to find footnote references (superscript numbers linking to footnotes)
    const refPatterns = [
      // href="#footnote_X" or href="#fn_X"
      new RegExp(
        `(<a[^>]*href=["']#(?:footnote|fn|note|endnote)[_-]?${footnote.id}["'][^>]*>)(\\d+|[*†‡§])(</a>)`,
        'gi'
      ),
      // Superscript with ID reference
      new RegExp(
        `(<sup[^>]*>\\s*<a[^>]*href=["']#(?:footnote|fn|note|endnote)[_-]?${footnote.id}["'][^>]*>)(\\d+)(</a>\\s*</sup>)`,
        'gi'
      ),
    ]

    for (const pattern of refPatterns) {
      const replacement = `$1$2$3<a href="${wikiUrl}" class="wiki-link" title="Wikipedia: ${primaryTerm}" target="_blank" rel="noopener noreferrer"><sup style="font-size:0.7em;margin-left:1px;text-decoration:none;color:#8b5a2b;">ⓦ</sup></a>`

      const before = modified
      modified = modified.replace(pattern, replacement)

      if (modified !== before) {
        linksAdded++
      }
    }
  }

  // If no links added via patterns, try a more aggressive approach
  if (linksAdded === 0 && footnotes.length > 0) {
    // Add links after any superscript footnote numbers
    for (const footnote of footnotes) {
      if (footnote.terms.length === 0) continue

      const primaryTerm = footnote.terms[0]
      const wikiUrl = getWikipediaUrl(primaryTerm)

      // Match superscript numbers
      const supPattern = new RegExp(`(<sup[^>]*>\\s*)(${footnote.id})(\\s*</sup>)`, 'g')
      const before = modified
      modified = modified.replace(
        supPattern,
        `$1$2$3<a href="${wikiUrl}" class="wiki-link" title="Wikipedia: ${primaryTerm}" target="_blank" rel="noopener noreferrer"><sup style="font-size:0.7em;margin-left:1px;text-decoration:none;color:#8b5a2b;">ⓦ</sup></a>`
      )

      if (modified !== before) {
        linksAdded++
      }
    }
  }

  return { html: modified, linksAdded }
}

// Add CSS styles for wiki links to the EPUB
function addWikiLinkStyles(html: string): string {
  const styles = `
<style>
.wiki-link {
  text-decoration: none;
  color: #8b5a2b;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.wiki-link:hover {
  opacity: 1;
}
.wiki-link sup {
  font-family: system-ui, sans-serif;
}
</style>`

  // Insert styles into head or at the beginning
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styles}</head>`)
  } else if (html.includes('<body')) {
    return html.replace(/<body/, `${styles}<body`)
  }
  return styles + html
}

// Main processing function
export async function processEpub(file: File): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    let totalLinksAdded = 0
    let totalFootnotesProcessed = 0
    const allTermsFound: string[] = []

    // Find and process all HTML/XHTML files
    const htmlFiles: string[] = []
    zip.forEach((path, entry) => {
      if (!entry.dir && (path.endsWith('.html') || path.endsWith('.xhtml') || path.endsWith('.htm'))) {
        htmlFiles.push(path)
      }
    })

    if (htmlFiles.length === 0) {
      return {
        success: false,
        error: 'No HTML content found in EPUB file. Please ensure this is a valid EPUB.',
      }
    }

    // First pass: collect all footnotes
    const allFootnotes: FootnoteMatch[] = []
    for (const path of htmlFiles) {
      const content = await zip.file(path)?.async('string')
      if (content) {
        const footnotes = findFootnotes(content)
        allFootnotes.push(...footnotes)
      }
    }

    totalFootnotesProcessed = allFootnotes.length
    allFootnotes.forEach(fn => allTermsFound.push(...fn.terms))

    // Second pass: add wiki links
    for (const path of htmlFiles) {
      const content = await zip.file(path)?.async('string')
      if (content) {
        // Find footnotes specific to this file
        const fileFootnotes = findFootnotes(content)

        // Add links
        let { html: modified, linksAdded } = addWikiLinks(content, fileFootnotes)

        // Add styles if links were added
        if (linksAdded > 0) {
          modified = addWikiLinkStyles(modified)
        }

        totalLinksAdded += linksAdded

        // Update the file in the zip
        zip.file(path, modified)
      }
    }

    // Generate output
    const outputBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })

    // Generate output filename
    const baseName = file.name.replace(/\.epub$/i, '')
    const outputFilename = `${baseName}_wiki_linked.epub`

    return {
      success: true,
      epub: outputBlob,
      filename: outputFilename,
      stats: {
        linksAdded: totalLinksAdded,
        footnotesProcessed: totalFootnotesProcessed,
        termsFound: [...new Set(allTermsFound)],
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while processing the EPUB.',
    }
  }
}

// Usage tracking
const STORAGE_KEY = 'wikiread_usage'
const FREE_LIMIT = 1

interface UsageData {
  conversions: number
  lastReset: string
}

export function getUsageData(): UsageData {
  if (typeof window === 'undefined') {
    return { conversions: 0, lastReset: new Date().toISOString() }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore errors
  }

  return { conversions: 0, lastReset: new Date().toISOString() }
}

export function incrementUsage(): void {
  if (typeof window === 'undefined') return

  const data = getUsageData()
  data.conversions++
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function canConvert(): boolean {
  const data = getUsageData()
  return data.conversions < FREE_LIMIT
}

export function getRemainingConversions(): number {
  const data = getUsageData()
  return Math.max(0, FREE_LIMIT - data.conversions)
}
