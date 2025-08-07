# 🔗 Схема соединений n8n Workflow

## 📋 **Список всех узлов (нод)**

| ID | Название ноды | Тип | Описание |
|---|---|---|---|
| 1 | `telegram-trigger` | Trigger | Telegram Trigger - входная точка |
| 2 | `message-parser` | Code | Message Parser - парсинг сообщений |
| 3 | `message-router` | Switch | Message Router - маршрутизация |
| 4 | `subscription-checker` | Code | Subscription Checker - проверка подписки |
| 5 | `start-response` | Telegram | Start Response - ответ на /start |
| 6 | `subscription-response` | Telegram | Subscription Response - ответ на /tarif |
| 7 | `payment-response` | Telegram | Payment Response - ответ на /oplata |
| 8 | `help-response` | Telegram | Help Response - ответ на /help |
| 9 | `fallback-response` | Telegram | Fallback Response - неизвестная команда |
| 10 | `download-voice-file` | Telegram | Download Voice File - скачивание голоса |
| 11 | `transcribe-voice` | OpenAI | Transcribe Voice - транскрибация |
| 12 | `update-transcribed-message` | Set | Update Message - обновление текста |
| 13 | `subscription-gate` | If | Subscription Gate - проверка подписки для AI |
| 14 | `free-request-gate` | If | Free Request Gate - проверка лимитов |
| 15 | `ai-realtor-agent` | AI Agent | AI Realtor Agent - основной ИИ |
| 16 | `openai-chat-model` | OpenAI Model | OpenAI Chat Model - модель ИИ |
| 17 | `postgres-memory` | Memory | Postgres Memory - память диалогов |
| 18 | `knowledge-vector-store` | Vector Store | Vector Store - база знаний |
| 19 | `ai-response` | Telegram | AI Response - ответ ИИ |
| 20 | `limit-exceeded-response` | Telegram | Limit Response - превышен лимит |
| 21 | `log-conversation` | Supabase | Log Conversation - логирование |
| 22 | `update-request-counter` | Code | Update Counter - обновление счетчика |

## 🔗 **Детальная схема соединений**

### 1️⃣ **Telegram Trigger** → **Message Parser**
```
telegram-trigger (main output) → message-parser (main input)
```
**Описание**: Все входящие сообщения идут на парсинг

---

### 2️⃣ **Message Parser** → **Message Router**  
```
message-parser (main output) → message-router (main input)
```
**Описание**: Парсированные данные идут на маршрутизацию

---

### 3️⃣ **Message Router** → **Multiple Outputs**
```
message-router имеет 8 выходов:

Output 0 (start_command) → subscription-checker
Output 1 (subscription_info) → subscription-checker  
Output 2 (payment_info) → subscription-checker
Output 3 (help_command) → subscription-checker
Output 4 (voice_message) → download-voice-file
Output 5 (photo_message) → subscription-checker
Output 6 (document_message) → subscription-checker
Output 7 (fallback) → subscription-checker
```

---

### 4️⃣ **Subscription Checker** → **Response Handlers**
```
subscription-checker (main output) → 6 параллельных соединений:

1. subscription-checker → start-response
2. subscription-checker → subscription-response  
3. subscription-checker → payment-response
4. subscription-checker → help-response
5. subscription-checker → subscription-gate
6. subscription-checker → fallback-response
```

---

### 5️⃣ **Voice Processing Chain**
```
download-voice-file → transcribe-voice → update-transcribed-message → subscription-gate
```
**Последовательность**:
1. `download-voice-file (main)` → `transcribe-voice (main)`
2. `transcribe-voice (main)` → `update-transcribed-message (main)`  
3. `update-transcribed-message (main)` → `subscription-gate (main)`

---

### 6️⃣ **Subscription Gate** → **AI Pipeline**
```
subscription-gate имеет 2 выхода:

True (подписка активна): subscription-gate → ai-realtor-agent
False (нет подписки): subscription-gate → free-request-gate
```

---

### 7️⃣ **Free Request Gate** → **AI or Limit**
```
free-request-gate имеет 2 выхода:

True (есть бесплатные запросы): free-request-gate → ai-realtor-agent
False (лимит превышен): free-request-gate → limit-exceeded-response
```

---

### 8️⃣ **AI Agent Connections**
```
AI Agent получает 3 типа соединений:

1. LANGUAGE MODEL: openai-chat-model → ai-realtor-agent (ai_languageModel)
2. MEMORY: postgres-memory → ai-realtor-agent (ai_memory)  
3. TOOLS: knowledge-vector-store → ai-realtor-agent (ai_tool)
```

---

### 9️⃣ **AI Response Chain**
```
ai-realtor-agent → ai-response → log-conversation → update-request-counter
```
**Последовательность**:
1. `ai-realtor-agent (main)` → `ai-response (main)`
2. `ai-response (main)` → `log-conversation (main)`
3. `log-conversation (main)` → `update-request-counter (main)`

---

## 📊 **Визуальная схема**

```
┌─────────────────┐
│ Telegram Trigger│
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ Message Parser  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐     ┌──────────────────┐
│ Message Router  │────▶│ Download Voice   │
└─────────┬───────┘     │ File             │
          │             └─────────┬────────┘
          ▼                       │
┌─────────────────┐               ▼
│ Subscription    │     ┌──────────────────┐
│ Checker         │     │ Transcribe Voice │
└─────────┬───────┘     └─────────┬────────┘
          │                       │
          ▼                       ▼
   ┌─────────────┐      ┌──────────────────┐
   │ 6 Response  │      │ Update Message   │
   │ Handlers    │      └─────────┬────────┘
   └─────────────┘                │
          │                       ▼
          ▼              ┌──────────────────┐
┌─────────────────┐     │ Subscription Gate│
│ Direct Replies  │     └─────────┬────────┘
└─────────────────┘               │
                                  ▼
                         ┌──────────────────┐
                         │ Free Request Gate│
                         └─────────┬────────┘
                                   │
                         ┌─────────▼────────┐
                         │ AI Realtor Agent │◀─── OpenAI Model
                         └─────────┬────────┘◀─── Postgres Memory  
                                   │         ◀─── Vector Store
                                   ▼
                         ┌──────────────────┐
                         │ AI Response      │
                         └─────────┬────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │ Log Conversation │
                         └─────────┬────────┘
                                   │
                                   ▼
                         ┌──────────────────┐
                         │ Update Counter   │
                         └──────────────────┘
```

## 🔧 **Пошаговая инструкция подключения**

### Шаг 1: Основная цепочка
1. Соедините `telegram-trigger` с `message-parser`
2. Соедините `message-parser` с `message-router`

### Шаг 2: Настройте Message Router (8 выходов)
В узле `message-router` настройте выходы:
- **Output 0** (start_command) → `subscription-checker`
- **Output 1** (subscription_info) → `subscription-checker`  
- **Output 2** (payment_info) → `subscription-checker`
- **Output 3** (help_command) → `subscription-checker`
- **Output 4** (voice_message) → `download-voice-file`
- **Output 5** (photo_message) → `subscription-checker`
- **Output 6** (document_message) → `subscription-checker`
- **Output 7** (fallback) → `subscription-checker`

### Шаг 3: Подключите Subscription Checker (6 выходов)
От `subscription-checker` проведите соединения к:
1. `start-response`
2. `subscription-response`
3. `payment-response`  
4. `help-response`
5. `subscription-gate`
6. `fallback-response`

### Шаг 4: Голосовая цепочка
Последовательно соедините:
1. `download-voice-file` → `transcribe-voice`
2. `transcribe-voice` → `update-transcribed-message`
3. `update-transcribed-message` → `subscription-gate`

### Шаг 5: AI Pipeline
1. `subscription-gate` (True) → `ai-realtor-agent`
2. `subscription-gate` (False) → `free-request-gate`
3. `free-request-gate` (True) → `ai-realtor-agent`
4. `free-request-gate` (False) → `limit-exceeded-response`

### Шаг 6: AI Agent подключения
Подключите к `ai-realtor-agent`:
- `openai-chat-model` → **ai_languageModel** connection
- `postgres-memory` → **ai_memory** connection
- `knowledge-vector-store` → **ai_tool** connection

### Шаг 7: Финальная цепочка
1. `ai-realtor-agent` → `ai-response`
2. `ai-response` → `log-conversation`
3. `log-conversation` → `update-request-counter`

## ⚠️ **Важные моменты**

### Типы соединений:
- **main** - обычные соединения данных (синие линии)
- **ai_languageModel** - подключение языковой модели (зеленые линии)
- **ai_memory** - подключение памяти (фиолетовые линии)  
- **ai_tool** - подключение инструментов (оранжевые линии)

### Множественные выходы Switch:
- В `message-router` настройте 8 условий для разных типов сообщений
- Каждый выход должен иметь уникальное название (start_command, voice_message и т.д.)

### Условные узлы (If):
- `subscription-gate` - **True** = активная подписка, **False** = нет подписки
- `free-request-gate` - **True** = есть бесплатные запросы, **False** = лимит превышен

Эта схема показывает точную последовательность соединений для корректной работы workflow! 🎯