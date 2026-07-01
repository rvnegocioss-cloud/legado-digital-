-- 🔐 BACKUP DO SCHEMA SUPABASE - Legado Digital
-- Data: 30/06/2026 11:52
-- Antes da construção da Landing Page

-- Tabela: homenagens (Memoriais dos falecidos)
CREATE TABLE IF NOT EXISTS public.homenagens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_completo text NOT NULL,
    data_nascimento text,
    data_falecimento text,
    biografia text,
    foto_url text,
    video_url text,
    galeria_fotos text[],
    created_at timestamp without time zone DEFAULT now(),
    frase_preferida text,
    cidade text,
    musica_url text,
    timeline jsonb,
    slug text,
    memorial_slug text,
    visitor_name text,
    message text,
    likes integer DEFAULT 0,
    CONSTRAINT homenagens_pkey PRIMARY KEY (id)
);

-- Tabela: condolencias (Mensagens de visitantes)
CREATE TABLE IF NOT EXISTS public.condolencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    homenagem_id uuid,
    visitor_name text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT condolencias_pkey PRIMARY KEY (id),
    CONSTRAINT condolencias_homenagem_id_fkey 
        FOREIGN KEY (homenagem_id) REFERENCES public.homenagens(id)
);

-- RLS habilitado
ALTER TABLE public.homenagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condolencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS existentes (serão expandidas)
-- (políticas atuais preservadas)