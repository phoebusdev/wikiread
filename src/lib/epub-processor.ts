import JSZip from 'jszip'

// Known terms database - philosophy, history, and academic terms
const KNOWN_TERMS = new Set([
  // Ancient Philosophers
  'Plato', 'Aristotle', 'Socrates', 'Pythagoras', 'Thales', 'Anaximander',
  'Anaximenes', 'Heraclitus', 'Parmenides', 'Zeno of Elea', 'Empedocles',
  'Anaxagoras', 'Democritus', 'Protagoras', 'Gorgias', 'Diogenes',
  'Epicurus', 'Zeno of Citium', 'Seneca', 'Epictetus', 'Marcus Aurelius',
  'Plotinus', 'Porphyry', 'Proclus',

  // Medieval Philosophers
  'Augustine', 'Boethius', 'Anselm', 'Peter Abelard', 'Thomas Aquinas',
  'Duns Scotus', 'William of Ockham', 'Meister Eckhart', 'Nicholas of Cusa',
  'Averroes', 'Avicenna', 'Maimonides', 'Al-Farabi', 'Al-Ghazali',

  // Early Modern Philosophers
  'Descartes', 'Spinoza', 'Leibniz', 'Locke', 'Berkeley', 'Hume',
  'Hobbes', 'Bacon', 'Pascal', 'Malebranche', 'Montaigne',

  // Enlightenment
  'Kant', 'Rousseau', 'Voltaire', 'Montesquieu', 'Diderot', 'Condorcet',
  'Adam Smith', 'David Hume', 'Thomas Reid', 'Edmund Burke',

  // 19th Century
  'Hegel', 'Schopenhauer', 'Nietzsche', 'Kierkegaard', 'Marx', 'Engels',
  'John Stuart Mill', 'Bentham', 'Comte', 'Feuerbach', 'Stirner',
  'Schelling', 'Fichte', 'Schleiermacher', 'Dilthey', 'Brentano',
  'Frege', 'Peirce', 'William James', 'Emerson', 'Thoreau',

  // 20th Century Continental
  'Husserl', 'Heidegger', 'Sartre', 'Camus', 'Merleau-Ponty',
  'Simone de Beauvoir', 'Hannah Arendt', 'Levinas', 'Ricoeur',
  'Gadamer', 'Habermas', 'Adorno', 'Horkheimer', 'Marcuse', 'Benjamin',
  'Foucault', 'Derrida', 'Deleuze', 'Guattari', 'Lyotard', 'Baudrillard',
  'Barthes', 'Lacan', 'Althusser', 'Badiou', 'Rancière', 'Nancy',
  'Agamben', 'Žižek', 'Butler', 'Kristeva', 'Irigaray', 'Cixous',

  // 20th Century Analytic
  'Russell', 'Wittgenstein', 'Moore', 'Carnap', 'Quine', 'Kripke',
  'Davidson', 'Sellars', 'Rorty', 'Putnam', 'Dennett', 'Searle',
  'Chomsky', 'Rawls', 'Nozick', 'Dworkin', 'MacIntyre', 'Sandel',
  'Parfit', 'Nagel', 'Lewis', 'Anscombe', 'Foot', 'Murdoch',

  // Contemporary
  'Nick Land', 'Mark Fisher', 'Reza Negarestani', 'Ray Brassier',
  'Quentin Meillassoux', 'Graham Harman', 'Timothy Morton', 'Ian Bogost',
  'Bruno Latour', 'Donna Haraway', 'Karen Barad', 'Isabelle Stengers',

  // Concepts - Metaphysics/Ontology
  'Metaphysics', 'Ontology', 'Being', 'Becoming', 'Substance', 'Essence',
  'Existence', 'Reality', 'Appearance', 'Phenomenon', 'Noumenon',
  'Monism', 'Dualism', 'Pluralism', 'Idealism', 'Materialism', 'Realism',
  'Nominalism', 'Universals', 'Particulars', 'Haecceity', 'Quiddity',

  // Concepts - Epistemology
  'Epistemology', 'Knowledge', 'Belief', 'Justification', 'Truth',
  'Rationalism', 'Empiricism', 'Skepticism', 'Foundationalism', 'Coherentism',
  'A priori', 'A posteriori', 'Analytic', 'Synthetic', 'Necessary', 'Contingent',

  // Concepts - Ethics
  'Ethics', 'Morality', 'Virtue', 'Vice', 'Good', 'Evil', 'Right', 'Wrong',
  'Deontology', 'Consequentialism', 'Utilitarianism', 'Virtue Ethics',
  'Categorical Imperative', 'Golden Rule', 'Natural Law', 'Divine Command',

  // Concepts - Political Philosophy
  'Social Contract', 'State of Nature', 'Sovereignty', 'Liberty', 'Equality',
  'Justice', 'Rights', 'Democracy', 'Republic', 'Tyranny', 'Anarchy',
  'Communism', 'Socialism', 'Capitalism', 'Liberalism', 'Conservatism',
  'Fascism', 'Totalitarianism', 'Anarchism', 'Libertarianism',

  // Concepts - Logic/Language
  'Logic', 'Dialectic', 'Syllogism', 'Deduction', 'Induction', 'Abduction',
  'Validity', 'Soundness', 'Fallacy', 'Paradox', 'Antinomy', 'Aporia',
  'Semantics', 'Syntax', 'Pragmatics', 'Reference', 'Sense', 'Meaning',

  // Concepts - Phenomenology/Existentialism
  'Phenomenology', 'Intentionality', 'Consciousness', 'Lifeworld', 'Epoché',
  'Existentialism', 'Existence', 'Essence', 'Authenticity', 'Bad Faith',
  'Dasein', 'Being-in-the-world', 'Thrownness', 'Facticity', 'Anxiety',
  'Absurdism', 'Nihilism', 'Eternal Recurrence', 'Will to Power', 'Übermensch',

  // Concepts - Post-structuralism/Critical Theory
  'Deconstruction', 'Différance', 'Trace', 'Supplement', 'Logocentrism',
  'Discourse', 'Power', 'Knowledge', 'Discipline', 'Biopolitics', 'Governmentality',
  'Simulacrum', 'Hyperreality', 'Rhizome', 'Deterritorialization', 'Assemblage',
  'Schizoanalysis', 'Body without Organs', 'Desiring-machines', 'Machinic',
  'Accelerationism', 'Hyperstition', 'CCRU', 'Templexity', 'Libidinal Economy',

  // Concepts - Psychoanalysis
  'Psychoanalysis', 'Unconscious', 'Repression', 'Id', 'Ego', 'Superego',
  'Libido', 'Oedipus Complex', 'Castration', 'Lack', 'Desire', 'Drive',
  'Imaginary', 'Symbolic', 'Real', 'Mirror Stage', 'Objet petit a',

  // Major Works
  'Republic', 'Symposium', 'Phaedo', 'Phaedrus', 'Timaeus', 'Parmenides',
  'Nicomachean Ethics', 'Politics', 'Metaphysics', 'Poetics', 'Physics',
  'Meditations', 'Confessions', 'Summa Theologica', 'City of God',
  'Discourse on Method', 'Meditations on First Philosophy', 'Ethics',
  'Critique of Pure Reason', 'Critique of Practical Reason', 'Critique of Judgment',
  'Phenomenology of Spirit', 'Science of Logic', 'Philosophy of Right',
  'The World as Will and Representation', 'Beyond Good and Evil',
  'Thus Spoke Zarathustra', 'On the Genealogy of Morality', 'The Gay Science',
  'Being and Time', 'Being and Nothingness', 'Nausea', 'The Stranger', 'The Myth of Sisyphus',
  'Discipline and Punish', 'The History of Sexuality', 'Madness and Civilization',
  'Of Grammatology', 'Writing and Difference', 'Margins of Philosophy',
  'Anti-Oedipus', 'A Thousand Plateaus', 'Difference and Repetition',
  'Simulacra and Simulation', 'The System of Objects', 'Fatal Strategies',
  'Fanged Noumena', 'Capitalist Realism', 'Cyclonopedia',
  'Philosophical Investigations', 'Tractatus Logico-Philosophicus',
  'A Theory of Justice', 'Anarchy, State, and Utopia',

  // Historical Figures
  'Napoleon', 'Caesar', 'Alexander the Great', 'Charlemagne', 'Constantine',
  'Machiavelli', 'Thomas Jefferson', 'Benjamin Franklin', 'Abraham Lincoln',
  'Churchill', 'Gandhi', 'Martin Luther King', 'Malcolm X',
  'Martin Luther', 'Calvin', 'Erasmus', 'Thomas More',
  'Copernicus', 'Galileo', 'Newton', 'Darwin', 'Einstein', 'Freud',

  // Movements and Schools
  'Platonism', 'Neoplatonism', 'Aristotelianism', 'Stoicism', 'Epicureanism',
  'Scholasticism', 'Humanism', 'Renaissance', 'Enlightenment', 'Reformation',
  'Romanticism', 'German Idealism', 'Transcendentalism', 'Pragmatism',
  'Logical Positivism', 'Vienna Circle', 'Ordinary Language Philosophy',
  'Frankfurt School', 'Critical Theory', 'Structuralism', 'Post-structuralism',
  'Postmodernism', 'Speculative Realism', 'Object-Oriented Ontology',
  'New Materialism', 'Accelerationism', 'Xenofeminism',

  // Historical Periods
  'Classical Antiquity', 'Hellenistic Period', 'Roman Empire', 'Byzantine Empire',
  'Medieval Period', 'Middle Ages', 'Renaissance', 'Early Modern Period',
  'Age of Enlightenment', 'Industrial Revolution', 'French Revolution',
  'World War I', 'World War II', 'Cold War', 'Postwar Period',
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
  sourceFile?: string
}

// Extract terms from text
function extractTerms(text: string): string[] {
  const terms: string[] = []
  const seen = new Set<string>()

  // Check for known terms (case-insensitive search, preserve original case)
  for (const term of KNOWN_TERMS) {
    const lowerTerm = term.toLowerCase()
    const lowerText = text.toLowerCase()
    if (lowerText.includes(lowerTerm) && !seen.has(lowerTerm)) {
      terms.push(term)
      seen.add(lowerTerm)
    }
  }

  // Extract capitalized name patterns (e.g., "John Locke", "Jean-Paul Sartre")
  const namePattern = /\b([A-Z][a-zàáâãäåæçèéêëìíîïñòóôõöùúûü]+(?:[-\s]+(?:de|von|van|du|la|le|el|di|da|dos|del|den|der|ter)?[-\s]*[A-Z][a-zàáâãäåæçèéêëìíîïñòóôõöùúûü]+)+)\b/g
  let match
  while ((match = namePattern.exec(text)) !== null) {
    const name = match[1].trim()
    if (!seen.has(name.toLowerCase()) && !isCommonPhrase(name) && name.length > 3) {
      terms.push(name)
      seen.add(name.toLowerCase())
    }
  }

  // Extract single capitalized words that might be important (at least 4 chars)
  const singleWordPattern = /\b([A-Z][a-zàáâãäåæçèéêëìíîïñòóôõöùúûü]{3,})\b/g
  while ((match = singleWordPattern.exec(text)) !== null) {
    const word = match[1]
    if (!seen.has(word.toLowerCase()) && !isCommonWord(word)) {
      // Only add if it looks like a proper noun (not at sentence start or after period)
      const idx = match.index
      if (idx > 0 && !/[.!?]\s*$/.test(text.slice(Math.max(0, idx - 3), idx))) {
        terms.push(word)
        seen.add(word.toLowerCase())
      }
    }
  }

  // Extract quoted titles
  const quotePatterns = [
    /[""]([^""]+)[""]/g,
    /'([^']+)'/g,
    /«([^»]+)»/g,
    /„([^"]+)"/g,
  ]
  for (const pattern of quotePatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1].trim()
      if (title.length > 3 && title.length < 100 && !seen.has(title.toLowerCase())) {
        terms.push(title)
        seen.add(title.toLowerCase())
      }
    }
  }

  // Extract italicized works (common in citations)
  const italicPattern = /<(?:i|em)[^>]*>([^<]+)<\/(?:i|em)>/gi
  while ((match = italicPattern.exec(text)) !== null) {
    const title = match[1].trim()
    if (title.length > 3 && title.length < 100 && !seen.has(title.toLowerCase())) {
      terms.push(title)
      seen.add(title.toLowerCase())
    }
  }

  return terms.slice(0, 5) // Limit to top 5 terms per footnote
}

// Filter out common words that aren't Wikipedia-worthy
function isCommonWord(word: string): boolean {
  const common = new Set([
    'The', 'This', 'That', 'These', 'Those', 'Such', 'Much', 'Many',
    'However', 'Therefore', 'Moreover', 'Furthermore', 'Nevertheless',
    'Although', 'Because', 'Since', 'While', 'When', 'Where', 'What',
    'Which', 'Who', 'Whom', 'Whose', 'How', 'Why', 'Chapter', 'Section',
    'Part', 'Volume', 'Book', 'Page', 'Note', 'See', 'Also', 'Ibid',
    'According', 'Following', 'During', 'After', 'Before', 'Between',
  ])
  return common.has(word)
}

// Filter out common phrases that aren't Wikipedia-worthy
function isCommonPhrase(phrase: string): boolean {
  const common = [
    'New York', 'New Jersey', 'New England', 'New Orleans', 'Los Angeles',
    'United States', 'United Kingdom', 'United Nations', 'European Union',
  ]
  return common.includes(phrase) || phrase.split(/\s+/).length > 5
}

// Generate Wikipedia URL for a term
function getWikipediaUrl(term: string): string {
  const encoded = encodeURIComponent(term.replace(/ /g, '_'))
  return `https://en.wikipedia.org/wiki/${encoded}`
}

// Parse HTML content and find footnotes
function findFootnotes(html: string, filePath?: string): FootnoteMatch[] {
  const footnotes: FootnoteMatch[] = []
  const seenIds = new Set<string>()

  // More comprehensive patterns for footnote containers
  const patterns = [
    // ID-based patterns (various formats)
    /<(?:div|aside|section|p|li|span)[^>]*\bid=["'](?:footnote|fn|note|endnote|rearnote)[_-]?(\d+)["'][^>]*>([\s\S]*?)<\/(?:div|aside|section|p|li|span)>/gi,
    /<(?:div|aside|section|p|li|span)[^>]*\bid=["'](?:footnote|fn|note|endnote|rearnote)-([a-zA-Z0-9]+)["'][^>]*>([\s\S]*?)<\/(?:div|aside|section|p|li|span)>/gi,

    // Class-based patterns
    /<(?:div|aside|section|p|li|span)[^>]*\bclass=["'][^"']*(?:footnote|endnote|note-text|notetext|fn-text|fntext)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|aside|section|p|li|span)>/gi,

    // EPUB 3 epub:type patterns
    /<(?:div|aside|section|p|li|span)[^>]*\bepub:type=["'](?:footnote|endnote|note|rearnote)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|aside|section|p|li|span)>/gi,

    // Role-based patterns
    /<(?:div|aside|section|p|li|span)[^>]*\brole=["']doc-(?:footnote|endnote|note)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|aside|section|p|li|span)>/gi,

    // List item patterns in notes sections
    /<li[^>]*\bid=["'](?:fn|note|endnote)[_-]?(\d+)["'][^>]*>([\s\S]*?)<\/li>/gi,
  ]

  for (const pattern of patterns) {
    let match
    pattern.lastIndex = 0 // Reset regex state
    while ((match = pattern.exec(html)) !== null) {
      const id = match[1] || `note_${footnotes.length + 1}`
      const content = match[2] || match[1] || ''

      // Skip if we've seen this ID
      if (seenIds.has(id)) continue
      seenIds.add(id)

      // Strip HTML tags to get plain text
      const plainText = content
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (plainText.length > 15) {
        const terms = extractTerms(plainText)
        if (terms.length > 0) {
          footnotes.push({
            id,
            content: plainText,
            terms,
            sourceFile: filePath,
          })
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
  const addedRefs = new Set<string>()

  for (const footnote of footnotes) {
    if (footnote.terms.length === 0) continue

    // Use the first/most relevant term
    const primaryTerm = footnote.terms[0]
    const wikiUrl = getWikipediaUrl(primaryTerm)

    // Escape special regex characters in the ID
    const escapedId = footnote.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Pattern to find footnote references (multiple formats)
    const refPatterns = [
      // Standard href patterns
      new RegExp(
        `(<a[^>]*href=["']#(?:footnote|fn|note|endnote|rearnote)[_-]?${escapedId}["'][^>]*>)([^<]*)(</a>)`,
        'gi'
      ),
      // Superscript containing link
      new RegExp(
        `(<sup[^>]*>\\s*<a[^>]*href=["']#(?:footnote|fn|note|endnote|rearnote)[_-]?${escapedId}["'][^>]*>)([^<]*)(</a>\\s*</sup>)`,
        'gi'
      ),
      // Link containing superscript
      new RegExp(
        `(<a[^>]*href=["']#(?:footnote|fn|note|endnote|rearnote)[_-]?${escapedId}["'][^>]*>\\s*<sup[^>]*>)([^<]*)(</sup>\\s*</a>)`,
        'gi'
      ),
    ]

    for (const pattern of refPatterns) {
      const refKey = `${footnote.id}-${pattern.source}`
      if (addedRefs.has(refKey)) continue

      const replacement = `$1$2$3<a href="${wikiUrl}" class="wiki-link" title="Wikipedia: ${primaryTerm.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer"><sup style="font-size:0.65em;margin-left:2px;text-decoration:none;color:#6b4423;vertical-align:super;">ⓦ</sup></a>`

      const before = modified
      modified = modified.replace(pattern, replacement)

      if (modified !== before) {
        linksAdded++
        addedRefs.add(refKey)
      }
    }
  }

  // Fallback: if no links added via specific patterns, try matching superscript numbers
  if (linksAdded === 0 && footnotes.length > 0) {
    for (const footnote of footnotes) {
      if (footnote.terms.length === 0) continue

      const primaryTerm = footnote.terms[0]
      const wikiUrl = getWikipediaUrl(primaryTerm)
      const escapedId = footnote.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Match standalone superscript numbers
      const supPattern = new RegExp(
        `(<sup[^>]*>\\s*)(${escapedId})(\\s*</sup>)(?![^<]*</a>)`,
        'g'
      )

      const before = modified
      modified = modified.replace(
        supPattern,
        `$1$2$3<a href="${wikiUrl}" class="wiki-link" title="Wikipedia: ${primaryTerm.replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer"><sup style="font-size:0.65em;margin-left:2px;text-decoration:none;color:#6b4423;vertical-align:super;">ⓦ</sup></a>`
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
<style type="text/css">
.wiki-link {
  text-decoration: none !important;
  color: #6b4423 !important;
  border: none !important;
}
.wiki-link:hover {
  color: #4a2e18 !important;
}
.wiki-link sup {
  font-family: system-ui, -apple-system, sans-serif;
  font-weight: normal;
}
</style>`

  // Insert styles into head or at the beginning
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styles}\n</head>`)
  } else if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${styles}`)
  } else if (html.includes('<body')) {
    return html.replace(/<body/, `${styles}\n<body`)
  }
  return styles + '\n' + html
}

// Main processing function
export async function processEpub(file: File): Promise<ProcessingResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    let totalLinksAdded = 0
    let totalFootnotesProcessed = 0
    const allTermsFound: string[] = []
    const processedFiles: string[] = []

    // Find and process all HTML/XHTML files
    const htmlFiles: string[] = []
    zip.forEach((path, entry) => {
      if (!entry.dir && /\.(x?html?|htm)$/i.test(path)) {
        htmlFiles.push(path)
      }
    })

    if (htmlFiles.length === 0) {
      return {
        success: false,
        error: 'No HTML content found in EPUB file. Please ensure this is a valid EPUB.',
      }
    }

    // First pass: collect all footnotes from all files
    const allFootnotes: FootnoteMatch[] = []
    for (const path of htmlFiles) {
      const content = await zip.file(path)?.async('string')
      if (content) {
        const footnotes = findFootnotes(content, path)
        allFootnotes.push(...footnotes)
      }
    }

    totalFootnotesProcessed = allFootnotes.length
    allFootnotes.forEach(fn => allTermsFound.push(...fn.terms))

    // Second pass: add wiki links to all files
    for (const path of htmlFiles) {
      const content = await zip.file(path)?.async('string')
      if (content) {
        // Use all footnotes for linking (cross-file references)
        const { html: modified, linksAdded } = addWikiLinks(content, allFootnotes)

        if (linksAdded > 0) {
          // Add styles if links were added
          const styledHtml = addWikiLinkStyles(modified)
          zip.file(path, styledHtml)
          totalLinksAdded += linksAdded
          processedFiles.push(path)
        } else if (modified !== content) {
          zip.file(path, modified)
        }
      }
    }

    // Generate output
    const outputBlob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    })

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
        termsFound: [...new Set(allTermsFound)].slice(0, 50), // Limit displayed terms
      },
    }
  } catch (error) {
    console.error('EPUB processing error:', error)
    return {
      success: false,
      error: error instanceof Error
        ? `Processing failed: ${error.message}`
        : 'An unexpected error occurred while processing the EPUB.',
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
