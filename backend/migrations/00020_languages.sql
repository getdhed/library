-- +goose Up
-- +goose StatementBegin
CREATE TABLE languages (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO languages (name) VALUES 
('Английский'), 
('Китайский'), 
('Испанский'), 
('Французский');

UPDATE documents
SET title_translations = 
  (
    SELECT jsonb_object_agg(
      CASE k 
        WHEN 'en' THEN 'Английский' 
        WHEN 'zh' THEN 'Китайский' 
        WHEN 'es' THEN 'Испанский' 
        WHEN 'fr' THEN 'Французский' 
        ELSE k 
      END, 
      v
    )
    FROM jsonb_each(title_translations) AS t(k, v)
  )
WHERE title_translations IS NOT NULL AND title_translations != '{}'::jsonb;

UPDATE document_submissions
SET title_translations =
  (
    SELECT jsonb_object_agg(
      CASE k
        WHEN 'en' THEN 'Английский'
        WHEN 'zh' THEN 'Китайский'
        WHEN 'es' THEN 'Испанский'
        WHEN 'fr' THEN 'Французский'
        ELSE k
      END,
      v
    )
    FROM jsonb_each(title_translations) AS t(k, v)
  )
WHERE title_translations IS NOT NULL AND title_translations != '{}'::jsonb;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
UPDATE documents
SET title_translations = 
  (
    SELECT jsonb_object_agg(
      CASE k 
        WHEN 'Английский' THEN 'en' 
        WHEN 'Китайский' THEN 'zh' 
        WHEN 'Испанский' THEN 'es' 
        WHEN 'Французский' THEN 'fr' 
        ELSE k 
      END, 
      v
    )
    FROM jsonb_each(title_translations) AS t(k, v)
  )
WHERE title_translations IS NOT NULL AND title_translations != '{}'::jsonb;

UPDATE document_submissions
SET title_translations =
  (
    SELECT jsonb_object_agg(
      CASE k
        WHEN 'Английский' THEN 'en'
        WHEN 'Китайский' THEN 'zh'
        WHEN 'Испанский' THEN 'es'
        WHEN 'Французский' THEN 'fr'
        ELSE k
      END,
      v
    )
    FROM jsonb_each(title_translations) AS t(k, v)
  )
WHERE title_translations IS NOT NULL AND title_translations != '{}'::jsonb;

DROP TABLE languages;
-- +goose StatementEnd
