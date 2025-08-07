# ⚡ Быстрый гайд по подключению нод

## 🎯 **Краткая схема "от-куда → к-куда"**

### 📥 **ВХОДНАЯ ЦЕПОЧКА**
```
1. telegram-trigger → message-parser
2. message-parser → message-router
```

### 🔀 **ROUTER OUTPUTS (8 выходов)**
```
message-router:
├── Output 0 (start_command) ────────┐
├── Output 1 (subscription_info) ────┤
├── Output 2 (payment_info) ─────────┤
├── Output 3 (help_command) ─────────┼──→ subscription-checker
├── Output 5 (photo_message) ────────┤
├── Output 6 (document_message) ─────┤
├── Output 7 (fallback) ─────────────┘
└── Output 4 (voice_message) ────────→ download-voice-file
```

### 🎭 **SUBSCRIPTION CHECKER OUTPUTS (6 выходов)**
```
subscription-checker:
├─→ start-response
├─→ subscription-response  
├─→ payment-response
├─→ help-response
├─→ subscription-gate
└─→ fallback-response
```

### 🎤 **VOICE PROCESSING**
```
download-voice-file → transcribe-voice → update-transcribed-message → subscription-gate
```

### 🤖 **AI PIPELINE**
```
subscription-gate:
├── True ──→ ai-realtor-agent
└── False ─→ free-request-gate
                ├── True ──→ ai-realtor-agent  
                └── False ─→ limit-exceeded-response
```

### 🧠 **AI AGENT INPUTS**
```
К ai-realtor-agent подключаются:
• openai-chat-model (ai_languageModel)
• postgres-memory (ai_memory)
• knowledge-vector-store (ai_tool)
```

### 📤 **OUTPUT CHAIN**
```
ai-realtor-agent → ai-response → log-conversation → update-request-counter
```

---

## 🔧 **Пошаговые действия в n8n**

### Шаг 1: Создайте все ноды
1. Добавьте 22 ноды согласно списку
2. Расположите их логично на канвасе
3. Настройте credentials для каждой ноды

### Шаг 2: Основные соединения (2 штуки)
```
✅ telegram-trigger [main] → message-parser [input]
✅ message-parser [main] → message-router [input]
```

### Шаг 3: Message Router (8 соединений)
Кликните на message-router и проведите линии:
```
✅ Output 0 → subscription-checker
✅ Output 1 → subscription-checker  
✅ Output 2 → subscription-checker
✅ Output 3 → subscription-checker
✅ Output 4 → download-voice-file  ⭐ (ОСОБОЕ!)
✅ Output 5 → subscription-checker
✅ Output 6 → subscription-checker
✅ Output 7 → subscription-checker
```

### Шаг 4: Subscription Checker (6 соединений)
От subscription-checker к:
```
✅ start-response
✅ subscription-response
✅ payment-response
✅ help-response  
✅ subscription-gate
✅ fallback-response
```

### Шаг 5: Voice Chain (3 соединения)
```
✅ download-voice-file → transcribe-voice
✅ transcribe-voice → update-transcribed-message
✅ update-transcribed-message → subscription-gate
```

### Шаг 6: Gates (4 соединения)
```
✅ subscription-gate [True] → ai-realtor-agent
✅ subscription-gate [False] → free-request-gate
✅ free-request-gate [True] → ai-realtor-agent
✅ free-request-gate [False] → limit-exceeded-response
```

### Шаг 7: AI Agent (3 специальных соединения)
```
⚠️ ВНИМАНИЕ: Это НЕ обычные main соединения!

✅ openai-chat-model → ai-realtor-agent (тип: ai_languageModel)
✅ postgres-memory → ai-realtor-agent (тип: ai_memory)
✅ knowledge-vector-store → ai-realtor-agent (тип: ai_tool)
```

### Шаг 8: Final Chain (3 соединения)
```
✅ ai-realtor-agent → ai-response
✅ ai-response → log-conversation  
✅ log-conversation → update-request-counter
```

---

## 🎨 **Цветовая схема соединений**

| Тип соединения | Цвет в n8n | Описание |
|---|---|---|
| `main` | 🔵 Синий | Обычные данные |
| `ai_languageModel` | 🟢 Зеленый | Языковая модель |
| `ai_memory` | 🟣 Фиолетовый | Память |
| `ai_tool` | 🟠 Оранжевый | Инструменты |

---

## ✅ **Чек-лист проверки**

### Проверьте количество соединений:
- [ ] **telegram-trigger**: 1 выход
- [ ] **message-parser**: 1 вход, 1 выход  
- [ ] **message-router**: 1 вход, 8 выходов
- [ ] **subscription-checker**: 7 входов, 6 выходов
- [ ] **download-voice-file**: 1 вход, 1 выход
- [ ] **transcribe-voice**: 1 вход, 1 выход
- [ ] **update-transcribed-message**: 1 вход, 1 выход
- [ ] **subscription-gate**: 2 входа, 2 выхода
- [ ] **free-request-gate**: 1 вход, 2 выхода
- [ ] **ai-realtor-agent**: 5 входов (2 main + 3 AI)
- [ ] **ai-response**: 1 вход, 1 выход
- [ ] **log-conversation**: 1 вход, 1 выход
- [ ] **update-request-counter**: 1 вход, 0 выходов

### Response Handlers (только входы):
- [ ] **start-response**: 1 вход
- [ ] **subscription-response**: 1 вход
- [ ] **payment-response**: 1 вход
- [ ] **help-response**: 1 вход
- [ ] **fallback-response**: 1 вход
- [ ] **limit-exceeded-response**: 1 вход

### AI Components (только выходы к AI Agent):
- [ ] **openai-chat-model**: ai_languageModel → ai-realtor-agent
- [ ] **postgres-memory**: ai_memory → ai-realtor-agent  
- [ ] **knowledge-vector-store**: ai_tool → ai-realtor-agent

---

## 🚨 **Частые ошибки**

❌ **НЕ подключайте**:
- Response handlers друг к другу
- AI components к main входам
- Несколько main соединений к одному входу

✅ **ПРАВИЛЬНО**:
- Один main выход может идти к нескольким входам
- AI connections имеют специальные типы
- Все response handlers работают параллельно

---

## 🎯 **Итого соединений: 41**

- 📘 Main connections: 35
- 🟢 AI Language Model: 1  
- 🟣 AI Memory: 1
- 🟠 AI Tool: 1
- 📊 **TOTAL**: 38 connections

Следуйте этой схеме точно, и workflow будет работать идеально! 🚀