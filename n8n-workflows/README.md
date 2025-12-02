# WikiRead Scholar - n8n Workflow Setup

Complete guide to setting up the n8n workflows for WikiRead Scholar's AI-powered reading assistant.

## Prerequisites

- n8n instance (self-hosted or cloud)
- Supabase project with pgvector extension
- OpenAI API key

## Workflow Files

| File | Purpose | Webhook Path |
|------|---------|--------------|
| `01-process-book.json` | Processes uploaded EPUBs, extracts text, chunks, embeds | `/process-book` |
| `02-generate-annotations.json` | Creates personalized annotations based on user profile | `/generate-annotations` |
| `03-chat.json` | RAG-powered chat with the book | `/chat` |
| `04-export-zotero.json` | Exports notes/highlights to Zotero formats | `/export-zotero` |

## Setup Instructions

### 1. Set Up Supabase

1. Create a new Supabase project
2. Enable the `vector` extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Run the schema from `database/schema.sql`

### 2. Configure n8n Credentials

Create the following credentials in n8n:

**Supabase API:**
- Name: `Supabase`
- URL: Your Supabase project URL
- API Key: Your Supabase `service_role` key (for backend operations)

**OpenAI API:**
- Name: `OpenAI`
- API Key: Your OpenAI API key

### 3. Import Workflows

1. Go to n8n → Workflows → Import from file
2. Import each JSON file in order (01, 02, 03, 04)
3. After import, update the credential IDs:
   - Replace `SUPABASE_CREDENTIAL_ID` with your actual Supabase credential ID
   - Replace `OPENAI_CREDENTIAL_ID` with your actual OpenAI credential ID

### 4. Activate Workflows

1. Open each workflow
2. Click "Activate" to enable the webhook endpoints
3. Copy the production webhook URLs for your frontend `.env`

## Environment Variables (Frontend)

Add to your Next.js `.env.local`:

```env
# n8n Webhook URLs
N8N_PROCESS_BOOK_URL=https://your-n8n.com/webhook/process-book
N8N_GENERATE_ANNOTATIONS_URL=https://your-n8n.com/webhook/generate-annotations
N8N_CHAT_URL=https://your-n8n.com/webhook/chat
N8N_EXPORT_URL=https://your-n8n.com/webhook/export-zotero

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Workflow Details

### 01-process-book.json

**Trigger:** POST to `/process-book`

**Input:**
```json
{
  "book_id": "uuid",
  "file_url": "https://storage.url/file.epub"
}
```

**Process:**
1. Updates book status to "processing"
2. Downloads EPUB from storage
3. Extracts text from HTML/XHTML files
4. Chunks text (~500 tokens each)
5. Generates embeddings via OpenAI
6. Stores chunks with embeddings in Supabase
7. Analyzes content for prerequisites (authors, concepts, frameworks)
8. Updates book status to "ready"

**Output:** Success response

---

### 02-generate-annotations.json

**Trigger:** POST to `/generate-annotations`

**Input:**
```json
{
  "book_id": "uuid",
  "user_id": "uuid"
}
```

**Process:**
1. Fetches user's knowledge profile
2. Gets all book chunks
3. Batches chunks (10 at a time)
4. GPT-4 analyzes each batch against user knowledge
5. Generates personalized annotations (skips known concepts)
6. Stores annotations in database
7. Updates user-book record

**Output:** Success response

---

### 03-chat.json

**Trigger:** POST to `/chat`

**Input:**
```json
{
  "book_id": "uuid",
  "user_id": "uuid",
  "query": "What does the author mean by...",
  "selected_text": "optional highlighted text",
  "chat_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "current_chapter": 5
}
```

**Process:**
1. Embeds the user's query
2. Vector search for relevant book passages
3. Fetches user profile and book metadata
4. Builds context-aware prompt
5. GPT-4 generates response grounded in book content
6. Stores conversation in database

**Output:**
```json
{
  "response": "Based on Chapter 3, the author...",
  "sources": {
    "chapters_referenced": ["Chapter 3", "Chapter 7"],
    "passages_used": 5
  }
}
```

---

### 04-export-zotero.json

**Trigger:** POST to `/export-zotero`

**Input:**
```json
{
  "book_id": "uuid",
  "user_id": "uuid",
  "format": "rdf" | "json" | "markdown"
}
```

**Process:**
1. Fetches book metadata
2. Gets all user annotations
3. Gets all highlights
4. Gets all personal notes
5. Generates export in requested format

**Output:**
```json
{
  "format": "rdf",
  "filename": "Book_Title_annotations.rdf",
  "content": "<?xml version...",
  "mimeType": "application/rdf+xml"
}
```

## Cost Estimation

Per book processed (~100k words):
- Embedding: ~$0.02 (text-embedding-ada-002)
- Annotation generation: ~$0.50 (GPT-4 Turbo)
- Chat (per query): ~$0.02

Monthly estimate at 100 books: ~$55

## Troubleshooting

**Workflow not triggering:**
- Ensure workflow is activated
- Check webhook URL is correct
- Verify Supabase credentials have correct permissions

**Embeddings failing:**
- Check OpenAI API key is valid
- Ensure chunks aren't too large (max 8k tokens)

**Vector search returning no results:**
- Verify `pgvector` extension is enabled
- Check embeddings were stored correctly
- Ensure index was created on `embedding` column

## Security Notes

- The Supabase credential should use `service_role` key (not anon)
- All webhooks should validate the request origin
- Consider adding authentication headers to webhook calls
- Row Level Security (RLS) policies handle user data isolation
