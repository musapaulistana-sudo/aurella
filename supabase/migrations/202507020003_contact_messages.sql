-- Mensagens do formulário Fale Conosco

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(30),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created
  ON contact_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status
  ON contact_messages (status);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Inserção e leitura apenas via service role (API routes)

UPDATE site_settings
SET contact_page_href = '/fale-conosco'
WHERE contact_page_href IS NULL
   OR contact_page_href = ''
   OR contact_page_href = '/paginas/fale-conosco';
