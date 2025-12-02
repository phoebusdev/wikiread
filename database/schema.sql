-- WikiRead Scholar Database Schema
-- Run this on a new Supabase project

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (managed by Supabase Auth, this extends it)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    academic_level TEXT CHECK (academic_level IN ('high_school', 'undergraduate', 'graduate', 'postgraduate', 'professional')),
    fields_of_study TEXT[] DEFAULT '{}',
    books_read TEXT[] DEFAULT '{}',
    known_authors TEXT[] DEFAULT '{}',
    known_concepts TEXT[] DEFAULT '{}',
    reading_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    publisher TEXT,
    year TEXT,
    file_url TEXT NOT NULL,
    cover_url TEXT,
    file_type TEXT CHECK (file_type IN ('epub', 'pdf')) DEFAULT 'epub',
    file_size_bytes BIGINT,
    processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'ready', 'error')) DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    total_chapters INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Book chunks for vector search
CREATE TABLE public.book_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    chapter_number INTEGER,
    chapter_title TEXT,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT CHECK (content_type IN ('body', 'footnote', 'heading', 'quote')) DEFAULT 'body',
    paragraph_index INTEGER,
    word_count INTEGER,
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector index for similarity search
CREATE INDEX book_chunks_embedding_idx ON public.book_chunks
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Index for fast chunk lookup
CREATE INDEX book_chunks_book_id_idx ON public.book_chunks(book_id);
CREATE INDEX book_chunks_chunk_index_idx ON public.book_chunks(book_id, chunk_index);

-- User-book relationship (tracks which books user has added)
CREATE TABLE public.user_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    reading_progress FLOAT DEFAULT 0 CHECK (reading_progress >= 0 AND reading_progress <= 1),
    current_chapter INTEGER DEFAULT 1,
    current_position TEXT,
    annotations_generated BOOLEAN DEFAULT FALSE,
    annotations_generated_at TIMESTAMPTZ,
    last_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Annotations (AI-generated, personalized)
CREATE TABLE public.annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chunk_index INTEGER NOT NULL,
    term TEXT NOT NULL,
    annotation_type TEXT CHECK (annotation_type IN ('author', 'concept', 'reference', 'context', 'definition')) NOT NULL,
    explanation TEXT NOT NULL,
    wikipedia_url TEXT,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    is_personalized BOOLEAN DEFAULT TRUE,
    dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX annotations_book_user_idx ON public.annotations(book_id, user_id);
CREATE INDEX annotations_chunk_idx ON public.annotations(book_id, chunk_index);

-- User highlights
CREATE TABLE public.highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chapter_number INTEGER,
    text TEXT NOT NULL,
    cfi_range TEXT, -- EPUB CFI for precise location
    color TEXT DEFAULT 'yellow' CHECK (color IN ('yellow', 'green', 'blue', 'pink', 'orange')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX highlights_book_user_idx ON public.highlights(book_id, user_id);

-- User notes (standalone notes, not attached to highlights)
CREATE TABLE public.user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chapter_number INTEGER,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX user_notes_book_user_idx ON public.user_notes(book_id, user_id);

-- Chat messages (conversation history)
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX chat_messages_book_user_idx ON public.chat_messages(book_id, user_id, created_at);

-- Row Level Security Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- User profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Books: users can only see their own books
CREATE POLICY "Users can view own books" ON public.books
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own books" ON public.books
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own books" ON public.books
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own books" ON public.books
    FOR DELETE USING (auth.uid() = user_id);

-- Book chunks: users can see chunks for their books
CREATE POLICY "Users can view own book chunks" ON public.book_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.books
            WHERE books.id = book_chunks.book_id
            AND books.user_id = auth.uid()
        )
    );

-- User books relationship
CREATE POLICY "Users can view own user_books" ON public.user_books
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own user_books" ON public.user_books
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own user_books" ON public.user_books
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own user_books" ON public.user_books
    FOR DELETE USING (auth.uid() = user_id);

-- Annotations
CREATE POLICY "Users can view own annotations" ON public.annotations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own annotations" ON public.annotations
    FOR UPDATE USING (auth.uid() = user_id);

-- Highlights
CREATE POLICY "Users can view own highlights" ON public.highlights
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own highlights" ON public.highlights
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own highlights" ON public.highlights
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own highlights" ON public.highlights
    FOR DELETE USING (auth.uid() = user_id);

-- User notes
CREATE POLICY "Users can view own notes" ON public.user_notes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.user_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.user_notes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.user_notes
    FOR DELETE USING (auth.uid() = user_id);

-- Chat messages
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
    FOR SELECT USING (auth.uid() = user_id);

-- Service role policies (for n8n backend operations)
-- These allow the service_role key to bypass RLS
CREATE POLICY "Service role can do anything on books" ON public.books
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do anything on book_chunks" ON public.book_chunks
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do anything on annotations" ON public.annotations
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do anything on chat_messages" ON public.chat_messages
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can do anything on user_books" ON public.user_books
    FOR ALL USING (auth.role() = 'service_role');

-- Functions

-- Function to search book chunks by similarity
CREATE OR REPLACE FUNCTION search_book_chunks(
    p_book_id UUID,
    p_query_embedding VECTOR(1536),
    p_limit INTEGER DEFAULT 5,
    p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    chapter_number INTEGER,
    chapter_title TEXT,
    chunk_index INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.id,
        bc.content,
        bc.chapter_number,
        bc.chapter_title,
        bc.chunk_index,
        1 - (bc.embedding <=> p_query_embedding) as similarity
    FROM public.book_chunks bc
    WHERE bc.book_id = p_book_id
      AND 1 - (bc.embedding <=> p_query_embedding) > p_similarity_threshold
    ORDER BY bc.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$;

-- Function to update user's known concepts after reading
CREATE OR REPLACE FUNCTION update_user_knowledge(
    p_user_id UUID,
    p_new_concepts TEXT[],
    p_new_authors TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.user_profiles
    SET
        known_concepts = ARRAY(
            SELECT DISTINCT unnest(known_concepts || p_new_concepts)
        ),
        known_authors = ARRAY(
            SELECT DISTINCT unnest(known_authors || p_new_authors)
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;
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

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON public.books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_highlights_updated_at
    BEFORE UPDATE ON public.highlights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_notes_updated_at
    BEFORE UPDATE ON public.user_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage bucket setup (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('books', 'books', false);

-- Storage policies would be:
-- CREATE POLICY "Users can upload books" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can view own books" ON storage.objects
--     FOR SELECT USING (bucket_id = 'books' AND auth.uid()::text = (storage.foldername(name))[1]);
