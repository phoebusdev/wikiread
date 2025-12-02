# WikiRead Scholar: Complete Implementation Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. ONBOARDING                                                               │
│     ├── Sign up / Login (Supabase Auth)                                      │
│     ├── "What have you read?" → Add books to knowledge profile               │
│     └── Set reading preferences (annotation depth, topics of interest)       │
│                                                                              │
│  2. LIBRARY                                                                  │
│     ├── Upload EPUB/PDF                                                      │
│     ├── View uploaded books                                                  │
│     └── See processing status                                                │
│                                                                              │
│  3. READER (Mobile-First)                                                    │
│     ├── Read book in browser                                                 │
│     ├── Select text → "Ask about this" / "Add note" / "Highlight"           │
│     ├── Chat sidebar for general questions                                   │
│     ├── View AI-generated annotations inline                                 │
│     └── Sync reading position across devices                                 │
│                                                                              │
│  4. EXPORT                                                                   │
│     ├── Download annotated EPUB                                              │
│     ├── Export notes/highlights as Zotero RDF                               │
│     └── Export as Markdown/JSON                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Database Schema (Supabase)

### SQL Migration

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'scholar')),
  books_this_month INTEGER DEFAULT 0,
  subscription_status TEXT DEFAULT 'inactive',
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge profile (what user has read/knows)
CREATE TABLE public.knowledge_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  books_read JSONB DEFAULT '[]',           -- [{title, author, year}]
  familiar_authors TEXT[] DEFAULT '{}',
  familiar_concepts TEXT[] DEFAULT '{}',
  unfamiliar_flags TEXT[] DEFAULT '{}',
  preferred_depth TEXT DEFAULT 'intermediate' CHECK (preferred_depth IN ('introductory', 'intermediate', 'academic')),
  topics_of_interest TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Uploaded books
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  cover_url TEXT,
  file_path TEXT NOT NULL,              -- Supabase Storage path
  file_type TEXT CHECK (file_type IN ('epub', 'pdf')),
  file_size_bytes INTEGER,
  total_chapters INTEGER,
  total_pages INTEGER,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed')),
  processing_error TEXT,
  metadata JSONB DEFAULT '{}',           -- Publisher, year, language, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Book content chunks (for RAG)
CREATE TABLE public.book_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_number INTEGER,
  chapter_title TEXT,
  chunk_index INTEGER,                   -- Order within chapter
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'body' CHECK (content_type IN ('body', 'footnote', 'heading', 'quote')),
  page_number INTEGER,
  paragraph_index INTEGER,
  word_count INTEGER,
  embedding VECTOR(1536),                -- OpenAI ada-002 dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX book_chunks_embedding_idx ON public.book_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- AI-generated annotations
CREATE TABLE public.annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES public.book_chunks(id) ON DELETE SET NULL,
  annotation_type TEXT CHECK (annotation_type IN ('definition', 'context', 'prerequisite', 'connection', 'summary')),
  target_term TEXT,                      -- The term being explained
  target_position JSONB,                 -- {chapter, paragraph, char_start, char_end}
  content TEXT NOT NULL,                 -- The annotation text
  wikipedia_url TEXT,
  source TEXT DEFAULT 'ai' CHECK (source IN ('ai', 'user', 'wikipedia')),
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User highlights and notes
CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES public.book_chunks(id) ON DELETE SET NULL,
  highlighted_text TEXT NOT NULL,
  note TEXT,                             -- User's note on the highlight
  color TEXT DEFAULT 'yellow',
  position JSONB NOT NULL,               -- {chapter, page, char_start, char_end}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading progress
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_chapter INTEGER DEFAULT 1,
  current_page INTEGER DEFAULT 1,
  current_position JSONB,                -- {cfi for EPUB, page for PDF}
  percent_complete DECIMAL(5,2) DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  total_reading_time_seconds INTEGER DEFAULT 0,
  UNIQUE(book_id, user_id)
);

-- Chat history
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_chunks UUID[],                 -- References to chunks used for RAG
  selected_text TEXT,                    -- If message was about selected text
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own knowledge profile" ON public.knowledge_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own books" ON public.books FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own book chunks" ON public.book_chunks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.books WHERE books.id = book_chunks.book_id AND books.user_id = auth.uid())
);
CREATE POLICY "Users can manage own annotations" ON public.annotations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own highlights" ON public.highlights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own reading progress" ON public.reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own chat messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id);

-- Function to match chunks by similarity
CREATE OR REPLACE FUNCTION match_book_chunks(
  query_embedding VECTOR(1536),
  match_book_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  chapter_title TEXT,
  page_number INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.content,
    bc.chapter_title,
    bc.page_number,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM public.book_chunks bc
  WHERE bc.book_id = match_book_id
    AND 1 - (bc.embedding <=> query_embedding) > match_threshold
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_profiles_updated_at BEFORE UPDATE ON public.knowledge_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER highlights_updated_at BEFORE UPDATE ON public.highlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Storage Buckets

Create in Supabase Dashboard → Storage:

1. **`books`** - Private bucket for uploaded EPUBs/PDFs
2. **`covers`** - Public bucket for book cover images

---

## Part 2: n8n Workflows

### Prerequisites

Install these n8n nodes:
- HTTP Request
- Supabase
- OpenAI
- Code (JavaScript)
- Webhook

Set these credentials in n8n:
- `supabase_api` - Supabase service role key
- `openai_api` - OpenAI API key

### Workflow 1: Process Uploaded Book

**Trigger:** Webhook receives EPUB/PDF upload notification

```json
{
  "name": "WikiRead: Process Book",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "process-book",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Update Status: Processing",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 300],
      "parameters": {
        "operation": "update",
        "tableId": "books",
        "filters": {
          "id": "={{ $json.book_id }}"
        },
        "fieldsToSend": {
          "processing_status": "processing"
        }
      }
    },
    {
      "name": "Download Book File",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300],
      "parameters": {
        "method": "GET",
        "url": "={{ $json.file_url }}",
        "responseFormat": "file"
      }
    },
    {
      "name": "Extract Text & Chunk",
      "type": "n8n-nodes-base.code",
      "position": [850, 300],
      "parameters": {
        "jsCode": "// See 'Book Processing Code' section below"
      }
    },
    {
      "name": "Generate Embeddings",
      "type": "n8n-nodes-base.openAi",
      "position": [1050, 300],
      "parameters": {
        "operation": "embed",
        "model": "text-embedding-ada-002",
        "input": "={{ $json.chunks }}"
      }
    },
    {
      "name": "Store Chunks in Supabase",
      "type": "n8n-nodes-base.supabase",
      "position": [1250, 300],
      "parameters": {
        "operation": "insert",
        "tableId": "book_chunks",
        "dataToInsert": "={{ $json.chunksWithEmbeddings }}"
      }
    },
    {
      "name": "Analyze Prerequisites",
      "type": "n8n-nodes-base.openAi",
      "position": [1450, 300],
      "parameters": {
        "operation": "chat",
        "model": "gpt-4-turbo-preview",
        "messages": [
          {
            "role": "system",
            "content": "You are an academic reading assistant. Analyze this book's content and identify:\n1. Key authors/thinkers referenced\n2. Prerequisite concepts readers should understand\n3. Main philosophical/theoretical frameworks used\n\nReturn as JSON: {authors: [], concepts: [], frameworks: []}"
          },
          {
            "role": "user",
            "content": "={{ $json.sampleContent }}"
          }
        ],
        "responseFormat": "json_object"
      }
    },
    {
      "name": "Update Book Metadata",
      "type": "n8n-nodes-base.supabase",
      "position": [1650, 300],
      "parameters": {
        "operation": "update",
        "tableId": "books",
        "filters": {
          "id": "={{ $json.book_id }}"
        },
        "fieldsToSend": {
          "processing_status": "ready",
          "processed_at": "={{ new Date().toISOString() }}",
          "metadata": "={{ JSON.stringify($json.prerequisites) }}"
        }
      }
    },
    {
      "name": "Respond Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1850, 300],
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ {success: true, book_id: $json.book_id} }}"
      }
    }
  ],
  "connections": {
    "Webhook": {"main": [[{"node": "Update Status: Processing"}]]},
    "Update Status: Processing": {"main": [[{"node": "Download Book File"}]]},
    "Download Book File": {"main": [[{"node": "Extract Text & Chunk"}]]},
    "Extract Text & Chunk": {"main": [[{"node": "Generate Embeddings"}]]},
    "Generate Embeddings": {"main": [[{"node": "Store Chunks in Supabase"}]]},
    "Store Chunks in Supabase": {"main": [[{"node": "Analyze Prerequisites"}]]},
    "Analyze Prerequisites": {"main": [[{"node": "Update Book Metadata"}]]},
    "Update Book Metadata": {"main": [[{"node": "Respond Success"}]]}
  }
}
```

#### Book Processing Code (for "Extract Text & Chunk" node):

```javascript
const JSZip = require('jszip');

// Input: binary file data from previous node
const fileData = $input.first().binary.data;
const bookId = $input.first().json.book_id;

// Parse EPUB
const zip = await JSZip.loadAsync(Buffer.from(fileData, 'base64'));
const chunks = [];

// Find all HTML/XHTML files
const htmlFiles = Object.keys(zip.files).filter(f => /\.(x?html?)$/i.test(f));

let chunkIndex = 0;
for (const filePath of htmlFiles) {
  const content = await zip.file(filePath).async('string');

  // Extract chapter title
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  const chapterTitle = titleMatch ? titleMatch[1] : filePath;

  // Strip HTML and split into paragraphs
  const textContent = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 50);

  // Create chunks (~500 tokens each, ~2000 chars)
  let currentChunk = '';
  let paragraphIndex = 0;

  for (const para of textContent) {
    if (currentChunk.length + para.length > 2000) {
      if (currentChunk.length > 100) {
        chunks.push({
          book_id: bookId,
          chapter_title: chapterTitle,
          chunk_index: chunkIndex++,
          content: currentChunk.trim(),
          content_type: 'body',
          paragraph_index: paragraphIndex,
          word_count: currentChunk.split(/\s+/).length
        });
      }
      currentChunk = para;
    } else {
      currentChunk += '\n\n' + para;
    }
    paragraphIndex++;
  }

  // Don't forget last chunk
  if (currentChunk.length > 100) {
    chunks.push({
      book_id: bookId,
      chapter_title: chapterTitle,
      chunk_index: chunkIndex++,
      content: currentChunk.trim(),
      content_type: 'body',
      paragraph_index: paragraphIndex,
      word_count: currentChunk.split(/\s+/).length
    });
  }
}

// Sample content for prerequisite analysis (first 5 chunks)
const sampleContent = chunks.slice(0, 5).map(c => c.content).join('\n\n---\n\n');

return {
  json: {
    book_id: bookId,
    chunks: chunks,
    sampleContent: sampleContent,
    totalChunks: chunks.length
  }
};
```

---

### Workflow 2: Generate Annotations

**Trigger:** Webhook called after book processing or on-demand

```json
{
  "name": "WikiRead: Generate Annotations",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "generate-annotations",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Get User Knowledge Profile",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 300],
      "parameters": {
        "operation": "select",
        "tableId": "knowledge_profiles",
        "filters": {
          "user_id": "={{ $json.user_id }}"
        }
      }
    },
    {
      "name": "Get Book Prerequisites",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 450],
      "parameters": {
        "operation": "select",
        "tableId": "books",
        "filters": {
          "id": "={{ $json.book_id }}"
        },
        "fields": "metadata"
      }
    },
    {
      "name": "Identify Knowledge Gaps",
      "type": "n8n-nodes-base.code",
      "position": [650, 375],
      "parameters": {
        "jsCode": "// Compare user's knowledge with book's prerequisites\nconst userProfile = $('Get User Knowledge Profile').first().json;\nconst bookMeta = $('Get Book Prerequisites').first().json.metadata;\n\nconst userKnows = new Set([\n  ...userProfile.familiar_authors || [],\n  ...userProfile.familiar_concepts || []\n]);\n\nconst bookNeeds = [\n  ...(bookMeta.authors || []),\n  ...(bookMeta.concepts || []),\n  ...(bookMeta.frameworks || [])\n];\n\n// Find gaps\nconst gaps = bookNeeds.filter(item => !userKnows.has(item.toLowerCase()));\n\nreturn {\n  json: {\n    gaps: gaps,\n    userProfile: userProfile,\n    annotationDepth: userProfile.preferred_depth || 'intermediate'\n  }\n};"
      }
    },
    {
      "name": "Get Relevant Chunks",
      "type": "n8n-nodes-base.supabase",
      "position": [850, 375],
      "parameters": {
        "operation": "select",
        "tableId": "book_chunks",
        "filters": {
          "book_id": "={{ $json.book_id }}"
        },
        "limit": 50
      }
    },
    {
      "name": "Generate Annotations with GPT-4",
      "type": "n8n-nodes-base.openAi",
      "position": [1050, 375],
      "parameters": {
        "operation": "chat",
        "model": "gpt-4-turbo-preview",
        "messages": [
          {
            "role": "system",
            "content": "You are an academic annotation assistant. Given a text chunk and a list of concepts the reader is unfamiliar with, generate helpful annotations.\n\nFor each unfamiliar term/concept that appears in the text:\n1. Identify its location\n2. Write a concise explanation appropriate for the reader's level\n3. Include a Wikipedia link if applicable\n\nReader's level: {{ $json.annotationDepth }}\nUnfamiliar concepts: {{ $json.gaps.join(', ') }}\n\nReturn JSON array: [{term, explanation, wikipedia_url, position: {paragraph, char_start, char_end}}]"
          },
          {
            "role": "user",
            "content": "={{ $json.chunkContent }}"
          }
        ],
        "responseFormat": "json_object"
      }
    },
    {
      "name": "Store Annotations",
      "type": "n8n-nodes-base.supabase",
      "position": [1250, 375],
      "parameters": {
        "operation": "insert",
        "tableId": "annotations",
        "dataToInsert": "={{ $json.annotations }}"
      }
    },
    {
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1450, 375],
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ {success: true, annotations_count: $json.annotations.length} }}"
      }
    }
  ]
}
```

---

### Workflow 3: Chat / Ask About Selection

**Trigger:** Webhook receives chat message or selected text query

```json
{
  "name": "WikiRead: Chat Query",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "chat",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Embed Query",
      "type": "n8n-nodes-base.openAi",
      "position": [450, 300],
      "parameters": {
        "operation": "embed",
        "model": "text-embedding-ada-002",
        "input": "={{ $json.query }}"
      }
    },
    {
      "name": "Vector Search",
      "type": "n8n-nodes-base.supabase",
      "position": [650, 300],
      "parameters": {
        "operation": "executeRpc",
        "functionName": "match_book_chunks",
        "parameters": {
          "query_embedding": "={{ $json.embedding }}",
          "match_book_id": "={{ $json.book_id }}",
          "match_threshold": 0.7,
          "match_count": 5
        }
      }
    },
    {
      "name": "Get User Profile",
      "type": "n8n-nodes-base.supabase",
      "position": [650, 450],
      "parameters": {
        "operation": "select",
        "tableId": "knowledge_profiles",
        "filters": {
          "user_id": "={{ $json.user_id }}"
        }
      }
    },
    {
      "name": "Build Context",
      "type": "n8n-nodes-base.code",
      "position": [850, 375],
      "parameters": {
        "jsCode": "const chunks = $('Vector Search').first().json;\nconst userProfile = $('Get User Profile').first().json;\nconst originalQuery = $('Webhook').first().json.query;\nconst selectedText = $('Webhook').first().json.selected_text || null;\n\nlet context = chunks.map((c, i) => \n  `[${i+1}] (${c.chapter_title}, p.${c.page_number || '?'}):\\n${c.content}`\n).join('\\n\\n---\\n\\n');\n\nlet systemPrompt = `You are a scholarly reading assistant helping someone read an academic text.\n\nReader's background:\n- Familiar with: ${(userProfile.familiar_concepts || []).join(', ') || 'Not specified'}\n- Preferred depth: ${userProfile.preferred_depth || 'intermediate'}\n\nWhen answering:\n1. Reference specific passages using [1], [2], etc.\n2. Explain unfamiliar concepts at the reader's level\n3. Connect to concepts they already know when possible\n4. Be concise but thorough`;\n\nif (selectedText) {\n  systemPrompt += `\\n\\nThe reader has selected this passage and is asking about it:\\n\"${selectedText}\"`;\n}\n\nreturn {\n  json: {\n    systemPrompt,\n    context,\n    query: originalQuery,\n    chunkIds: chunks.map(c => c.id)\n  }\n};"
      }
    },
    {
      "name": "Generate Response",
      "type": "n8n-nodes-base.openAi",
      "position": [1050, 375],
      "parameters": {
        "operation": "chat",
        "model": "gpt-4-turbo-preview",
        "messages": [
          {
            "role": "system",
            "content": "={{ $json.systemPrompt }}"
          },
          {
            "role": "user",
            "content": "Context from the book:\n\n{{ $json.context }}\n\n---\n\nQuestion: {{ $json.query }}"
          }
        ]
      }
    },
    {
      "name": "Store Chat Message",
      "type": "n8n-nodes-base.supabase",
      "position": [1250, 375],
      "parameters": {
        "operation": "insert",
        "tableId": "chat_messages",
        "dataToInsert": [
          {
            "book_id": "={{ $('Webhook').first().json.book_id }}",
            "user_id": "={{ $('Webhook').first().json.user_id }}",
            "role": "user",
            "content": "={{ $('Webhook').first().json.query }}",
            "selected_text": "={{ $('Webhook').first().json.selected_text }}"
          },
          {
            "book_id": "={{ $('Webhook').first().json.book_id }}",
            "user_id": "={{ $('Webhook').first().json.user_id }}",
            "role": "assistant",
            "content": "={{ $json.response }}",
            "context_chunks": "={{ $('Build Context').first().json.chunkIds }}"
          }
        ]
      }
    },
    {
      "name": "Respond",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1450, 375],
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ {response: $json.response, sources: $('Build Context').first().json.chunkIds} }}"
      }
    }
  ]
}
```

---

### Workflow 4: Export to Zotero

**Trigger:** Webhook receives export request

```json
{
  "name": "WikiRead: Export Zotero",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "export-zotero",
        "responseMode": "responseNode"
      }
    },
    {
      "name": "Get Book",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 300],
      "parameters": {
        "operation": "select",
        "tableId": "books",
        "filters": {
          "id": "={{ $json.book_id }}"
        }
      }
    },
    {
      "name": "Get Highlights",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 450],
      "parameters": {
        "operation": "select",
        "tableId": "highlights",
        "filters": {
          "book_id": "={{ $json.book_id }}",
          "user_id": "={{ $json.user_id }}"
        }
      }
    },
    {
      "name": "Get Annotations",
      "type": "n8n-nodes-base.supabase",
      "position": [450, 600],
      "parameters": {
        "operation": "select",
        "tableId": "annotations",
        "filters": {
          "book_id": "={{ $json.book_id }}",
          "user_id": "={{ $json.user_id }}",
          "approved": true
        }
      }
    },
    {
      "name": "Generate Zotero RDF",
      "type": "n8n-nodes-base.code",
      "position": [700, 450],
      "parameters": {
        "jsCode": "// See Zotero RDF generation code below"
      }
    },
    {
      "name": "Respond with File",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [900, 450],
      "parameters": {
        "respondWith": "binary",
        "responseBody": "={{ $json.rdfContent }}",
        "options": {
          "responseHeaders": {
            "Content-Type": "application/rdf+xml",
            "Content-Disposition": "attachment; filename=\"notes.rdf\""
          }
        }
      }
    }
  ]
}
```

#### Zotero RDF Generation Code:

```javascript
const book = $('Get Book').first().json;
const highlights = $('Get Highlights').all().map(h => h.json);
const annotations = $('Get Annotations').all().map(a => a.json);

// Zotero RDF format
const rdf = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns:z="http://www.zotero.org/namespaces/export#"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:bib="http://purl.org/net/biblio#"
  xmlns:foaf="http://xmlns.com/foaf/0.1/">

  <bib:Book rdf:about="${book.id}">
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(book.author || 'Unknown')}</dc:creator>
    ${book.isbn ? `<dc:identifier>ISBN: ${book.isbn}</dc:identifier>` : ''}
  </bib:Book>

${highlights.map((h, i) => `
  <bib:Memo rdf:about="highlight-${i}">
    <rdf:type rdf:resource="http://www.zotero.org/namespaces/export#note"/>
    <dc:relation rdf:resource="${book.id}"/>
    <dc:description><![CDATA[<h2>Highlight</h2>
<blockquote>${escapeXml(h.highlighted_text)}</blockquote>
${h.note ? `<p><strong>Note:</strong> ${escapeXml(h.note)}</p>` : ''}
<p><em>Chapter ${h.position?.chapter || '?'}, Page ${h.position?.page || '?'}</em></p>]]></dc:description>
    <dcterms:dateSubmitted>${h.created_at}</dcterms:dateSubmitted>
  </bib:Memo>
`).join('')}

${annotations.map((a, i) => `
  <bib:Memo rdf:about="annotation-${i}">
    <rdf:type rdf:resource="http://www.zotero.org/namespaces/export#note"/>
    <dc:relation rdf:resource="${book.id}"/>
    <dc:description><![CDATA[<h2>${escapeXml(a.target_term)}</h2>
<p>${escapeXml(a.content)}</p>
${a.wikipedia_url ? `<p><a href="${a.wikipedia_url}">Wikipedia</a></p>` : ''}
<p><em>Type: ${a.annotation_type}</em></p>]]></dc:description>
    <dcterms:dateSubmitted>${a.created_at}</dcterms:dateSubmitted>
  </bib:Memo>
`).join('')}

</rdf:RDF>`;

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

return {
  json: {
    rdfContent: rdf
  }
};
```

---

## Part 3: n8n Setup Instructions

### Step-by-Step Setup

1. **Install n8n**
   ```bash
   npm install -g n8n
   # OR use Docker
   docker run -it --rm -p 5678:5678 n8nio/n8n
   ```

2. **Add Credentials**
   - Go to Settings → Credentials
   - Add "Supabase" credential:
     - Host: `https://your-project.supabase.co`
     - Service Role Key: (from Supabase Dashboard → Settings → API)
   - Add "OpenAI" credential:
     - API Key: your OpenAI key

3. **Import Workflows**
   - Go to Workflows → Import
   - Paste each workflow JSON above
   - Save and activate

4. **Configure Webhook URLs**
   After activating, n8n provides webhook URLs like:
   ```
   https://your-n8n.com/webhook/process-book
   https://your-n8n.com/webhook/generate-annotations
   https://your-n8n.com/webhook/chat
   https://your-n8n.com/webhook/export-zotero
   ```

5. **Set Environment Variables in Next.js**
   ```env
   N8N_WEBHOOK_BASE=https://your-n8n.com/webhook
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

---

## Part 4: Frontend Components

### Required New Pages/Components

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── onboarding/page.tsx      # "What have you read?"
│   ├── library/
│   │   └── page.tsx                  # Book library grid
│   ├── reader/
│   │   └── [bookId]/page.tsx         # E-reader with chat
│   └── api/
│       ├── books/
│       │   ├── upload/route.ts
│       │   └── [bookId]/
│       │       ├── route.ts
│       │       ├── chat/route.ts
│       │       └── export/route.ts
│       └── auth/
│           └── callback/route.ts
├── components/
│   ├── reader/
│   │   ├── EpubReader.tsx            # epub.js wrapper
│   │   ├── SelectionPopover.tsx      # "Ask" / "Highlight" / "Note"
│   │   ├── ChatSidebar.tsx           # Chat panel
│   │   ├── AnnotationTooltip.tsx     # Inline annotations
│   │   └── HighlightManager.tsx
│   ├── library/
│   │   ├── BookCard.tsx
│   │   ├── UploadModal.tsx
│   │   └── ProcessingStatus.tsx
│   └── onboarding/
│       ├── BookSearch.tsx            # Search for books you've read
│       └── KnowledgeProfileForm.tsx
└── lib/
    ├── supabase/
    │   ├── client.ts
    │   ├── server.ts
    │   └── types.ts
    └── n8n/
        └── client.ts                  # Webhook calls
```

### E-Reader Component (Key Parts)

```tsx
// src/components/reader/EpubReader.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import ePub, { Book, Rendition } from 'epubjs'
import { SelectionPopover } from './SelectionPopover'
import { ChatSidebar } from './ChatSidebar'
import { AnnotationTooltip } from './AnnotationTooltip'

interface EpubReaderProps {
  bookUrl: string
  bookId: string
  userId: string
  annotations: Annotation[]
  onHighlight: (highlight: Highlight) => void
  onProgressUpdate: (progress: Progress) => void
}

export function EpubReader({
  bookUrl,
  bookId,
  userId,
  annotations,
  onHighlight,
  onProgressUpdate
}: EpubReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)

  const [selection, setSelection] = useState<Selection | null>(null)
  const [selectionPosition, setSelectionPosition] = useState<{x: number, y: number} | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize epub.js
    const book = ePub(bookUrl)
    bookRef.current = book

    const rendition = book.renderTo(containerRef.current, {
      width: '100%',
      height: '100%',
      spread: 'none', // Single page for mobile
      flow: 'paginated'
    })
    renditionRef.current = rendition

    rendition.display()

    // Track reading progress
    rendition.on('relocated', (location) => {
      onProgressUpdate({
        currentPage: location.start.displayed.page,
        totalPages: location.start.displayed.total,
        cfi: location.start.cfi,
        percentComplete: book.locations.percentageFromCfi(location.start.cfi) * 100
      })
    })

    // Handle text selection
    rendition.on('selected', (cfiRange, contents) => {
      const selection = contents.window.getSelection()
      if (selection && selection.toString().trim()) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        setSelection({
          text: selection.toString(),
          cfi: cfiRange
        })
        setSelectionPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        })
      }
    })

    // Click away clears selection
    rendition.on('click', () => {
      setSelection(null)
      setSelectionPosition(null)
    })

    // Inject annotation styles
    rendition.themes.default({
      '.annotation-highlight': {
        'background-color': 'rgba(139, 90, 43, 0.2)',
        'border-bottom': '2px dotted #8b5a2b',
        'cursor': 'pointer'
      }
    })

    return () => {
      book.destroy()
    }
  }, [bookUrl])

  // Apply annotations to rendered content
  useEffect(() => {
    if (!renditionRef.current || !annotations.length) return

    annotations.forEach(annotation => {
      // Add highlight at annotation position
      renditionRef.current?.annotations.add(
        'highlight',
        annotation.cfi,
        {},
        (e) => {
          // Show tooltip on click
        },
        'annotation-highlight'
      )
    })
  }, [annotations])

  const handleAskAboutSelection = () => {
    if (selection) {
      setChatContext(selection.text)
      setChatOpen(true)
    }
  }

  const handleHighlightSelection = (color: string) => {
    if (selection) {
      renditionRef.current?.annotations.add(
        'highlight',
        selection.cfi,
        { color },
        undefined,
        `highlight-${color}`
      )
      onHighlight({
        text: selection.text,
        cfi: selection.cfi,
        color
      })
      setSelection(null)
    }
  }

  const handleAddNote = (note: string) => {
    if (selection) {
      onHighlight({
        text: selection.text,
        cfi: selection.cfi,
        color: 'yellow',
        note
      })
      setSelection(null)
    }
  }

  return (
    <div className="relative h-full flex">
      {/* Reader container */}
      <div
        ref={containerRef}
        className="flex-1 h-full bg-paper-50"
      />

      {/* Selection popover */}
      {selection && selectionPosition && (
        <SelectionPopover
          position={selectionPosition}
          onAsk={handleAskAboutSelection}
          onHighlight={handleHighlightSelection}
          onNote={handleAddNote}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Chat sidebar */}
      <ChatSidebar
        open={chatOpen}
        onClose={() => {
          setChatOpen(false)
          setChatContext(null)
        }}
        bookId={bookId}
        userId={userId}
        initialContext={chatContext}
      />

      {/* Chat toggle button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ink-700 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>
    </div>
  )
}
```

### Selection Popover Component

```tsx
// src/components/reader/SelectionPopover.tsx
'use client'

import { motion } from 'framer-motion'

interface SelectionPopoverProps {
  position: { x: number; y: number }
  onAsk: () => void
  onHighlight: (color: string) => void
  onNote: (note: string) => void
  onClose: () => void
}

export function SelectionPopover({
  position,
  onAsk,
  onHighlight,
  onNote,
  onClose
}: SelectionPopoverProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed z-50 bg-ink-800 text-white rounded-lg shadow-xl p-1 flex items-center gap-1"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)'
      }}
    >
      {/* Ask AI */}
      <button
        onClick={onAsk}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-ink-700 rounded-md text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Ask
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-ink-600" />

      {/* Highlight colors */}
      <div className="flex items-center gap-1 px-2">
        {['yellow', 'green', 'blue', 'pink'].map(color => (
          <button
            key={color}
            onClick={() => onHighlight(color)}
            className={`w-5 h-5 rounded-full border-2 border-white/20 hover:scale-110 transition-transform`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-ink-600" />

      {/* Add note */}
      <button
        onClick={() => {
          const note = prompt('Add a note:')
          if (note) onNote(note)
        }}
        className="flex items-center gap-1.5 px-3 py-2 hover:bg-ink-700 rounded-md text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Note
      </button>
    </motion.div>
  )
}
```

---

## Part 5: API Routes

### Book Upload Route

```typescript
// src/app/api/books/upload/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Upload to Supabase Storage
  const fileName = `${user.id}/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('books')
    .upload(fileName, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Create book record
  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      user_id: user.id,
      title: file.name.replace(/\.(epub|pdf)$/i, ''),
      file_path: uploadData.path,
      file_type: file.name.endsWith('.pdf') ? 'pdf' : 'epub',
      file_size_bytes: file.size,
      processing_status: 'pending'
    })
    .select()
    .single()

  if (bookError) {
    return NextResponse.json({ error: bookError.message }, { status: 500 })
  }

  // Trigger n8n processing
  const { publicUrl } = supabase.storage.from('books').getPublicUrl(uploadData.path).data

  await fetch(`${process.env.N8N_WEBHOOK_BASE}/process-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      book_id: book.id,
      user_id: user.id,
      file_url: publicUrl
    })
  })

  return NextResponse.json({ book })
}
```

### Chat Route

```typescript
// src/app/api/books/[bookId]/chat/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { query, selected_text } = await request.json()

  // Call n8n chat workflow
  const response = await fetch(`${process.env.N8N_WEBHOOK_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      book_id: params.bookId,
      user_id: user.id,
      query,
      selected_text
    })
  })

  const result = await response.json()
  return NextResponse.json(result)
}
```

### Export Route

```typescript
// src/app/api/books/[bookId]/export/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const format = request.nextUrl.searchParams.get('format') || 'zotero'

  // Call n8n export workflow
  const response = await fetch(`${process.env.N8N_WEBHOOK_BASE}/export-zotero`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      book_id: params.bookId,
      user_id: user.id,
      format
    })
  })

  const rdfContent = await response.text()

  return new NextResponse(rdfContent, {
    headers: {
      'Content-Type': 'application/rdf+xml',
      'Content-Disposition': `attachment; filename="notes-${params.bookId}.rdf"`
    }
  })
}
```

---

## Part 6: Dependencies to Install

```bash
# Frontend
npm install @supabase/supabase-js @supabase/ssr epubjs

# For PDF support (optional)
npm install pdfjs-dist
```

---

## Part 7: Environment Variables

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# n8n
N8N_WEBHOOK_BASE=https://your-n8n-instance.com/webhook

# OpenAI (for client-side if needed)
OPENAI_API_KEY=sk-...
```

---

## Summary: Build Order

1. **Set up Supabase**
   - Create project
   - Run SQL migration
   - Create storage buckets
   - Enable Auth

2. **Set up n8n**
   - Deploy n8n (self-hosted or cloud)
   - Add credentials
   - Import 4 workflows
   - Activate and get webhook URLs

3. **Build Frontend**
   - Add Supabase auth
   - Build onboarding flow
   - Build library page
   - Build e-reader with chat

4. **Connect Everything**
   - Wire up API routes to n8n webhooks
   - Test upload → process → read → chat → export flow

5. **Deploy**
   - Deploy frontend to Vercel
   - Ensure n8n is accessible
   - Set all environment variables
