-- ===============================================
-- Database Setup for Optimized Realtor Bot
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- ===============================================
-- SUPABASE TABLES
-- ===============================================

-- Таблица для логирования сообщений пользователей
CREATE TABLE IF NOT EXISTS user_messages (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    message_text TEXT,
    message_type TEXT CHECK (message_type IN ('text', 'voice', 'photo', 'document', 'callback')),
    command TEXT,
    is_subscribed BOOLEAN DEFAULT FALSE,
    ai_response TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы для быстрого поиска
    INDEX idx_user_messages_user_id (user_id),
    INDEX idx_user_messages_created_at (created_at DESC),
    INDEX idx_user_messages_command (command) WHERE command IS NOT NULL
);

-- Таблица пользователей с подписками
CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    subscription_end DATE,
    subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'premium', 'trial')),
    free_requests_used INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    referral_code TEXT,
    
    -- Индексы
    INDEX idx_users_subscription_end (subscription_end) WHERE subscription_end IS NOT NULL,
    INDEX idx_users_last_activity (last_activity DESC)
);

-- Таблица для knowledge base риелтора (vector store)
CREATE TABLE IF NOT EXISTS realtor_knowledge (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'general' CHECK (content_type IN ('legal', 'market', 'process', 'general', 'client')),
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- OpenAI embedding dimension
    source_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы для vector search
    INDEX idx_realtor_knowledge_user_id (user_id),
    INDEX idx_realtor_knowledge_content_type (content_type),
    INDEX idx_realtor_knowledge_embedding USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
);

-- Таблица для CRM клиентов (доступно по подписке)
CREATE TABLE IF NOT EXISTS realtor_clients (
    id SERIAL PRIMARY KEY,
    realtor_user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    client_telegram TEXT,
    budget_min DECIMAL(12,2),
    budget_max DECIMAL(12,2),
    property_type TEXT CHECK (property_type IN ('apartment', 'house', 'commercial', 'land', 'other')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deal_closed', 'lost', 'paused')),
    notes TEXT,
    tags JSONB DEFAULT '[]',
    last_contact TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы
    INDEX idx_realtor_clients_realtor_user_id (realtor_user_id),
    INDEX idx_realtor_clients_status (status),
    INDEX idx_realtor_clients_last_contact (last_contact DESC)
);

-- Таблица для аналитики и статистики
CREATE TABLE IF NOT EXISTS bot_analytics (
    id SERIAL PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN ('command_used', 'ai_request', 'subscription_check', 'error', 'conversion')),
    user_id BIGINT,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Индексы для аналитики
    INDEX idx_bot_analytics_event_type (event_type),
    INDEX idx_bot_analytics_created_at (created_at DESC),
    INDEX idx_bot_analytics_user_id (user_id) WHERE user_id IS NOT NULL
);

-- ===============================================
-- POSTGRES TABLES (для chat memory)
-- ===============================================

-- Таблица для истории диалогов (Langchain Postgres Memory)
CREATE TABLE IF NOT EXISTS chat_memory (
    session_id TEXT NOT NULL,
    message_index INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('human', 'ai', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (session_id, message_index),
    
    -- Индексы
    INDEX idx_chat_memory_session_id (session_id),
    INDEX idx_chat_memory_created_at (created_at DESC)
);

-- ===============================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ===============================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_realtor_knowledge_updated_at 
    BEFORE UPDATE ON realtor_knowledge 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_realtor_clients_updated_at 
    BEFORE UPDATE ON realtor_clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления статистики пользователя
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Обновляем счетчики при добавлении нового сообщения
    IF TG_OP = 'INSERT' THEN
        INSERT INTO users (user_id, username, first_name, last_activity, total_requests)
        VALUES (NEW.user_id, NEW.username, NEW.first_name, NOW(), 1)
        ON CONFLICT (user_id) DO UPDATE SET
            last_activity = NOW(),
            total_requests = users.total_requests + 1,
            username = COALESCE(NEW.username, users.username),
            first_name = COALESCE(NEW.first_name, users.first_name);
            
        -- Увеличиваем счетчик бесплатных запросов для AI
        IF NEW.ai_response IS NOT NULL THEN
            UPDATE users 
            SET free_requests_used = free_requests_used + 1 
            WHERE user_id = NEW.user_id 
            AND (subscription_end IS NULL OR subscription_end < CURRENT_DATE);
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления статистики
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON user_messages
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- ===============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ===============================================

-- Добавляем базовые знания для всех риелторов
INSERT INTO realtor_knowledge (user_id, title, content, content_type, is_public) VALUES
(0, 'Основы сделки купли-продажи', 'При сделке купли-продажи недвижимости необходимо: 1) Проверить документы на собственность 2) Оформить предварительный договор 3) Провести расчеты через банковскую ячейку 4) Зарегистрировать переход права собственности в Росреестре', 'legal', true),
(0, 'Документы для ипотеки', 'Для оформления ипотеки потребуются: паспорт, справка о доходах, трудовая книжка, документы на недвижимость, справка об отсутствии задолженностей, согласие супруга', 'process', true),
(0, 'Налоги при продаже недвижимости', 'При продаже недвижимости, находящейся в собственности менее 5 лет, необходимо уплатить подоходный налог 13%. Есть возможность получить вычет в размере 1 млн рублей', 'legal', true),
(0, 'Этапы сделки с новостройкой', 'Покупка в новостройке включает: выбор застройщика, проверка разрешений, бронирование квартиры, оформление ДДУ, внесение платежей по графику, получение ключей после сдачи дома', 'process', true);

-- Добавляем примеры событий аналитики
INSERT INTO bot_analytics (event_type, event_data) VALUES
('system_start', '{"version": "1.0", "optimization": "completed"}');

-- ===============================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ АНАЛИТИКИ
-- ===============================================

-- Представление для статистики пользователей
CREATE VIEW user_stats AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.subscription_type,
    u.subscription_end,
    u.free_requests_used,
    u.total_requests,
    u.registration_date,
    u.last_activity,
    COUNT(um.id) as messages_count,
    COUNT(CASE WHEN um.ai_response IS NOT NULL THEN 1 END) as ai_requests_count,
    COUNT(rc.id) as clients_count
FROM users u
LEFT JOIN user_messages um ON u.user_id = um.user_id
LEFT JOIN realtor_clients rc ON u.user_id = rc.realtor_user_id
GROUP BY u.user_id, u.username, u.first_name, u.subscription_type, 
         u.subscription_end, u.free_requests_used, u.total_requests, 
         u.registration_date, u.last_activity;

-- Представление для ежедневной статистики
CREATE VIEW daily_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_messages,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(CASE WHEN message_type = 'voice' THEN 1 END) as voice_messages,
    COUNT(CASE WHEN command IS NOT NULL THEN 1 END) as commands_used,
    COUNT(CASE WHEN ai_response IS NOT NULL THEN 1 END) as ai_requests,
    AVG(processing_time_ms) as avg_processing_time
FROM user_messages
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ===============================================
-- ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ===============================================

-- Дополнительные индексы для оптимизации запросов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_messages_composite 
ON user_messages (user_id, created_at DESC, message_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_subscription 
ON users (user_id) WHERE subscription_end > CURRENT_DATE;

-- ===============================================
-- ПРАВА ДОСТУПА
-- ===============================================

-- Создаем роль для n8n workflow
-- CREATE ROLE n8n_bot WITH LOGIN PASSWORD 'your_secure_password';
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO n8n_bot;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO n8n_bot;

-- ===============================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ===============================================

COMMENT ON TABLE user_messages IS 'Логирование всех сообщений пользователей и ответов бота';
COMMENT ON TABLE users IS 'Основная информация о пользователях и их подписках';
COMMENT ON TABLE realtor_knowledge IS 'База знаний для AI агента (vector store)';
COMMENT ON TABLE realtor_clients IS 'CRM система клиентов риелторов (доступно по подписке)';
COMMENT ON TABLE chat_memory IS 'История диалогов для персональной памяти AI';
COMMENT ON TABLE bot_analytics IS 'Аналитика использования бота';

-- ===============================================
-- ЗАВЕРШЕНИЕ НАСТРОЙКИ
-- ===============================================

-- Обновляем статистику для оптимизатора запросов
ANALYZE;

-- Выводим информацию о созданных таблицах
SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_messages', 'users', 'realtor_knowledge', 'realtor_clients', 'chat_memory', 'bot_analytics')
ORDER BY tablename;

PRINT 'Database setup completed successfully! 🎉';