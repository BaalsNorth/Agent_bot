# 📊 Таблица соединений workflow

## 🔗 **Полная таблица "ОТ → К"**

| № | От ноды | Тип выхода | К ноде | Тип входа | Описание |
|---|---------|------------|--------|-----------|----------|
| 1 | `telegram-trigger` | main | `message-parser` | main | Входящие сообщения |
| 2 | `message-parser` | main | `message-router` | main | Парсированные данные |
| 3 | `message-router` | Output 0 | `subscription-checker` | main | /start команда |
| 4 | `message-router` | Output 1 | `subscription-checker` | main | /tarif команда |
| 5 | `message-router` | Output 2 | `subscription-checker` | main | /oplata команда |
| 6 | `message-router` | Output 3 | `subscription-checker` | main | /help команда |
| 7 | `message-router` | Output 4 | `download-voice-file` | main | Голосовые сообщения |
| 8 | `message-router` | Output 5 | `subscription-checker` | main | Фото сообщения |
| 9 | `message-router` | Output 6 | `subscription-checker` | main | Документы |
| 10 | `message-router` | Output 7 | `subscription-checker` | main | Неизвестные команды |
| 11 | `subscription-checker` | main | `start-response` | main | Ответ на /start |
| 12 | `subscription-checker` | main | `subscription-response` | main | Ответ на /tarif |
| 13 | `subscription-checker` | main | `payment-response` | main | Ответ на /oplata |
| 14 | `subscription-checker` | main | `help-response` | main | Ответ на /help |
| 15 | `subscription-checker` | main | `subscription-gate` | main | Проверка для AI |
| 16 | `subscription-checker` | main | `fallback-response` | main | Неизвестная команда |
| 17 | `download-voice-file` | main | `transcribe-voice` | main | Скачанный файл |
| 18 | `transcribe-voice` | main | `update-transcribed-message` | main | Транскрибированный текст |
| 19 | `update-transcribed-message` | main | `subscription-gate` | main | Обновленное сообщение |
| 20 | `subscription-gate` | True | `ai-realtor-agent` | main | Активная подписка |
| 21 | `subscription-gate` | False | `free-request-gate` | main | Нет подписки |
| 22 | `free-request-gate` | True | `ai-realtor-agent` | main | Есть бесплатные запросы |
| 23 | `free-request-gate` | False | `limit-exceeded-response` | main | Лимит превышен |
| 24 | `openai-chat-model` | ai_languageModel | `ai-realtor-agent` | ai_languageModel | Языковая модель |
| 25 | `postgres-memory` | ai_memory | `ai-realtor-agent` | ai_memory | Память диалогов |
| 26 | `knowledge-vector-store` | ai_tool | `ai-realtor-agent` | ai_tool | База знаний |
| 27 | `ai-realtor-agent` | main | `ai-response` | main | Ответ от ИИ |
| 28 | `ai-response` | main | `log-conversation` | main | Отправленный ответ |
| 29 | `log-conversation` | main | `update-request-counter` | main | Логирование |

---

## 📋 **Список нод по группам**

### 🎯 **TRIGGERS & PARSERS**
1. `telegram-trigger` - Telegram Trigger
2. `message-parser` - Message Parser (Code)
3. `message-router` - Message Router (Switch)

### ⚙️ **LOGIC & CONTROL**
4. `subscription-checker` - Subscription Checker (Code)
5. `subscription-gate` - Subscription Gate (If)
6. `free-request-gate` - Free Request Gate (If)

### 💬 **RESPONSE HANDLERS**
7. `start-response` - Start Response (Telegram)
8. `subscription-response` - Subscription Response (Telegram)
9. `payment-response` - Payment Response (Telegram)
10. `help-response` - Help Response (Telegram)
11. `fallback-response` - Fallback Response (Telegram)
12. `limit-exceeded-response` - Limit Response (Telegram)

### 🎤 **VOICE PROCESSING**
13. `download-voice-file` - Download Voice File (Telegram)
14. `transcribe-voice` - Transcribe Voice (OpenAI)
15. `update-transcribed-message` - Update Message (Set)

### 🤖 **AI COMPONENTS**
16. `ai-realtor-agent` - AI Realtor Agent (AI Agent)
17. `openai-chat-model` - OpenAI Chat Model (LM)
18. `postgres-memory` - Postgres Memory (Memory)
19. `knowledge-vector-store` - Vector Store (Vector Store)

### 📤 **OUTPUT & LOGGING**
20. `ai-response` - AI Response (Telegram)
21. `log-conversation` - Log Conversation (Supabase)
22. `update-request-counter` - Update Counter (Code)

---

## 🎨 **Цветовая карта соединений**

### 🔵 **MAIN Connections (26 штук)**
- Все обычные соединения данных между узлами
- Синие линии в n8n интерфейсе

### 🟢 **AI_LANGUAGEMODEL (1 штука)**
- `openai-chat-model` → `ai-realtor-agent`
- Зеленая линия в n8n

### 🟣 **AI_MEMORY (1 штука)**
- `postgres-memory` → `ai-realtor-agent`
- Фиолетовая линия в n8n

### 🟠 **AI_TOOL (1 штука)**
- `knowledge-vector-store` → `ai-realtor-agent`
- Оранжевая линия в n8n

---

## ✅ **Быстрая проверка**

### Switch Router имеет 8 выходов:
- [ ] Output 0 (start_command)
- [ ] Output 1 (subscription_info)
- [ ] Output 2 (payment_info)
- [ ] Output 3 (help_command)
- [ ] Output 4 (voice_message) ⭐ **Особый!**
- [ ] Output 5 (photo_message)
- [ ] Output 6 (document_message)
- [ ] Output 7 (fallback)

### Subscription Checker принимает 7 входов:
- [ ] От Router Output 0, 1, 2, 3, 5, 6, 7 (все кроме 4)

### AI Agent принимает 5 входов:
- [ ] 2 main входа (от gates)
- [ ] 1 ai_languageModel (от chat model)
- [ ] 1 ai_memory (от postgres memory)
- [ ] 1 ai_tool (от vector store)

### Конечные точки (без выходов):
- [ ] 6 Response handlers
- [ ] update-request-counter

---

## 🎯 **ИТОГО: 29 соединений**

| Тип соединения | Количество |
|---|---|
| Main | 26 |
| AI Language Model | 1 |
| AI Memory | 1 |
| AI Tool | 1 |
| **TOTAL** | **29** |

Используйте эту таблицу как справочник при подключении нод в n8n! 🚀