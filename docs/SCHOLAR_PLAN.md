# WikiRead Scholar: AI Reading Assistant

## Overview

WikiRead Scholar is an AI-powered reading companion that transforms dense academic texts into personalized learning experiences. Upload a philosophy book, and Scholar identifies what you need to know, explains unfamiliar concepts inline, and lets you ask questions about the text as you read.

## The Problem

Academic texts—especially in philosophy, critical theory, and history—assume prerequisite knowledge. Reading Nick Land requires familiarity with Deleuze. Reading Deleuze requires familiarity with Spinoza, Nietzsche, and Lacan. Each text is a node in a vast network of references.

Current solutions are inadequate:
- **Footnotes** explain what the author chose to explain
- **Wikipedia** requires leaving your reading flow
- **ChatGPT** doesn't have your specific book's context
- **Academic companions** are generic, not personalized to your gaps

## The Solution

Scholar learns what *you* know and annotates accordingly.

### How It Works

1. **Upload your EPUB or PDF**
   - Scholar processes the text, identifying key concepts, references, and terminology

2. **Scholar analyzes prerequisites**
   - Cross-references against a knowledge graph of philosophical/academic concepts
   - Identifies which authors, works, and ideas the text assumes you understand

3. **Your knowledge profile shapes annotations**
   - Already read Anti-Oedipus? Scholar won't over-explain Deleuze
   - Never encountered Bataille? Scholar adds context where he appears

4. **Choose annotation depth**
   - *Inline definitions*: Brief explanations appear as tooltips
   - *Expanded footnotes*: Detailed explanations at chapter end
   - *Prerequisite reading list*: Curated suggestions before you begin

5. **Chat with your text**
   - Ask questions about any passage
   - Scholar answers with citations to the actual book
   - Turn chat explanations into new footnotes

6. **Download your personalized EPUB**
   - All annotations embedded
   - Wikipedia links included
   - Readable on any device

## User Experience

### First-Time User

```
1. Sign up for Scholar ($15/month, 10 books)
2. Upload "Fanged Noumena" by Nick Land
3. Scholar processes (30-60 seconds)
4. See analysis:

   "This text heavily references:
    - Deleuze & Guattari (42 mentions)
    - Bataille (18 mentions)
    - Kant (12 mentions)

    What's your familiarity?"

5. Select: "I've read Kant, not the others"
6. Scholar generates 67 annotations
7. Review, edit, approve
8. Download personalized EPUB
```

### Returning User

```
1. Upload "A Thousand Plateaus"
2. Scholar recognizes you've annotated Land
3. Knows you now understand some D&G concepts
4. Generates fewer, more targeted annotations
5. Your knowledge profile grows automatically
```

### Chat Interaction

```
You: "What does Land mean by 'templexity' on page 47?"

Scholar: "Templexity is Land's neologism combining 'temporal'
and 'complexity.' It refers to time-structures that fold back
on themselves—where effects precede causes. He develops this
most fully in the essay 'Templexity' (p.123-145 in your copy).

The concept draws on:
- Deleuze's 'crystal-image' from Cinema 2
- Cybernetic feedback loops
- His earlier work on hyperstition

[Add explanation as footnote to p.47?]"
```

## Knowledge Profile

Your profile persists across books and improves over time:

```json
{
  "books_processed": [
    {"title": "Fanged Noumena", "author": "Nick Land", "date": "2024-01"},
    {"title": "Anti-Oedipus", "author": "Deleuze & Guattari", "date": "2024-02"}
  ],
  "concepts_familiar": [
    "accelerationism",
    "deterritorialization",
    "schizoanalysis",
    "desiring-machines",
    "body without organs"
  ],
  "concepts_learning": [
    "capitalism and schizophrenia",
    "rhizome"
  ],
  "authors_familiar": ["Nick Land", "Deleuze", "Guattari"],
  "authors_unfamiliar": ["Lacan", "Bataille"],
  "preferred_depth": "academic",
  "annotation_style": "footnotes"
}
```

## Annotation Types

### 1. Inline Definitions
Brief, non-intrusive explanations that appear on hover/tap:

> "The BwO↗ is not opposed to organs but to the organism..."

↗ *Body without Organs: Deleuze & Guattari's concept of a plane of pure potential before organization into functional systems.*

### 2. Expanded Footnotes
Detailed explanations added to chapter endnotes:

> "Land's reading of schizoanalysis¹ diverges from..."

¹ **Schizoanalysis**: A method developed by Deleuze and Guattari in *Anti-Oedipus* (1972) as an alternative to Freudian psychoanalysis. Rather than interpreting desire through family structures (Oedipus), schizoanalysis traces desire as productive flows that connect to social, political, and economic systems. For Land, schizoanalysis becomes a tool for understanding capitalism's own desiring-production. See *Anti-Oedipus* Ch.1-2 for foundational treatment.

### 3. Prerequisite Reading List
Generated preface for each book:

> **Before Reading Fanged Noumena**
>
> This collection assumes familiarity with several philosophical traditions. Based on your current knowledge profile, we recommend:
>
> *Essential (you'll be lost without these)*
> - "Anti-Oedipus" by Deleuze & Guattari — Chapters 1-3
> - "Critique of Pure Reason" by Kant — Introduction and Transcendental Aesthetic
>
> *Helpful (enriches understanding)*
> - "The Accursed Share" by Bataille — Volume 1
> - "Difference and Repetition" by Deleuze — Introduction
>
> *Optional (deep background)*
> - "Course in General Linguistics" by Saussure
> - "Écrits" by Lacan — "The Mirror Stage"

## Technical Architecture

### Processing Pipeline (n8n)

```
EPUB Upload
    │
    ▼
[Extract Text] ──────────────────────────────────┐
    │                                            │
    ▼                                            │
[Chunk by Semantic Units]                        │
    │                                            │
    ▼                                            │
[Generate Embeddings] ◄── OpenAI text-embedding-ada-002
    │
    ▼
[Store in Vector DB] ◄── Supabase pgvector
    │
    ▼
[Analyze Prerequisites] ◄── GPT-4 with knowledge graph prompt
    │
    ▼
[Cross-Reference User Profile]
    │
    ▼
[Generate Annotations] ◄── GPT-4 with style guidelines
    │
    ▼
[Return to Frontend for Review]
    │
    ▼
[Compile Final EPUB with Annotations]
```

### Data Storage (Supabase)

**users**
- id, email, tier, knowledge_profile (JSONB)
- books_this_month, subscription_status

**books**
- id, user_id, title, author, original_file (Storage)
- processed_at, metadata (JSONB)

**chunks**
- id, book_id, chapter, section, content
- embedding (vector), token_count

**annotations**
- id, book_id, type, position, content
- approved, created_at

### Chat (RAG Pipeline)

```
User Message
    │
    ▼
[Embed Query] ◄── OpenAI
    │
    ▼
[Vector Search] ◄── Top 5 relevant chunks
    │
    ▼
[Construct Prompt]
    │
    ├── System: "You are a reading assistant..."
    ├── Context: [Retrieved chunks with page numbers]
    └── User: [Original question]
    │
    ▼
[Generate Response] ◄── GPT-4
    │
    ▼
[Return with Citations]
```

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 1 Wikipedia-only conversion |
| Pro | $5/month | 50 Wikipedia conversions |
| Scholar | $15/month | 10 AI-annotated books, chat, knowledge profile |

*Scholar pricing breakdown: ~$5 in costs (embeddings, LLM, storage) = 1/3 of price*

## Roadmap

### Phase 1: Core Utility (Current)
- [x] EPUB Wikipedia linking
- [ ] PDF support
- [ ] Multiple annotation styles
- [ ] Basic auth and usage tracking

### Phase 2: Scholar Beta
- [ ] n8n processing pipeline
- [ ] Supabase integration
- [ ] Basic knowledge profile
- [ ] Annotation generation (single type)

### Phase 3: Scholar Launch
- [ ] Full annotation types
- [ ] Chat interface
- [ ] Profile learning over time
- [ ] Stripe billing integration

### Phase 4: Enhancement
- [ ] Browser extension (annotate web articles)
- [ ] Mobile app (read annotated books)
- [ ] Community knowledge graphs
- [ ] Multi-language support

## Design Principles

1. **Reading flow is sacred** — Never interrupt the reading experience. Annotations should enhance, not distract.

2. **Your knowledge, not ours** — Scholar adapts to you. Two readers of the same book get different annotations.

3. **Transparent AI** — Every annotation shows its reasoning. You can edit, reject, or expand any suggestion.

4. **Privacy by default** — Your reading history and knowledge profile belong to you. We don't share or analyze across users.

5. **Offline-first output** — Once downloaded, your annotated EPUB works anywhere, forever, with no internet required.
