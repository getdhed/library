-- +goose Up
CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Insert current distinct types from documents table
INSERT INTO document_types (name)
SELECT DISTINCT type FROM documents WHERE TRIM(type) <> ''
ON CONFLICT (name) DO NOTHING;

-- Insert defaults requested by user and from old defaults
INSERT INTO document_types (name) VALUES 
('Автореферат диссертации'),
('Альбом'),
('Диссертация'),
('Другое'),
('Информационный бюллетень'),
('Курс лекций'),
('Материалы обобщения опыта'),
('Методические рекомендации'),
('Методическое пособие'),
('Монография'),
('НИР'),
('Пособие'),
('Практическое пособие'),
('Сборник'),
('Сборник научных статей'),
('Сборник трудов'),
('Словарь'),
('Справочник'),
('Статья'),
('Учебно-методическое пособие'),
('Учебное пособие'),
('Учебник'),
('Журнал'),
('Закон'),
('Постановление'),
('Буклет'),
('Сборник материалов'),
('Кодекс'),
('Учебное издание'),
('Лексический практикум'),
('Сборник задач'),
('Приложение'),
('Альбом схем')
ON CONFLICT (name) DO NOTHING;

-- +goose Down
DROP TABLE document_types;
