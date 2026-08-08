-- Create the animations table
CREATE TABLE IF NOT EXISTS public.animations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    origin TEXT DEFAULT 'Khác',
    gender TEXT DEFAULT 'Khác',
    description TEXT,
    file_url TEXT NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: In Supabase Dashboard -> Storage, you must also create a new bucket named:
-- "animations"
-- Make sure it is Public so users can download the files!
