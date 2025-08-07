# 📱 Визуальный гайд настройки Subscription Gate

## 🎯 **Пошаговая настройка в n8n интерфейсе**

### Шаг 1: Добавление узла
```
1. Нажмите "+" для добавления узла
2. Найдите "IF" в поиске
3. Выберите "IF" узел
4. Переименуйте в "Subscription Gate"
```

### Шаг 2: Основные настройки
```
┌─────────────────────────────────────┐
│ ⚙️ Subscription Gate Parameters      │
├─────────────────────────────────────┤
│                                     │
│ 🔍 Conditions                       │
│                                     │
│ Left Value:                         │
│ ┌─────────────────────────────────┐ │
│ │ ={{ $json.subscription.isActive }}│ │
│ └─────────────────────────────────┘ │
│                                     │
│ Operator:                           │
│ ┌─────────────────────────────────┐ │
│ │ Boolean ▼                       │ │
│ │   └─ Is True ▼                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Right Value:                        │
│ ┌─────────────────────────────────┐ │
│ │ (empty - not needed)            │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### Шаг 3: Дополнительные опции
```
┌─────────────────────────────────────┐
│ ⚙️ Additional Options               │
├─────────────────────────────────────┤
│                                     │
│ ☐ Case Sensitive                    │
│ (оставить выключенным)              │
│                                     │
│ Type Validation:                    │
│ ┌─────────────────────────────────┐ │
│ │ Strict ▼                        │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔌 **Подключение узла**

### Входящие соединения (2 источника)
```
📥 ВХОДЫ В Subscription Gate:

1️⃣ От subscription-checker (команды)
   subscription-checker ──────┐
                              │
2️⃣ От update-transcribed-msg  ├─→ Subscription Gate
   update-transcribed-msg ────┘
```

### Исходящие соединения (2 выхода)
```
📤 ВЫХОДЫ ИЗ Subscription Gate:

                           ┌─ TRUE ──→ ai-realtor-agent
Subscription Gate ─────────┤
                           └─ FALSE ─→ free-request-gate
```

---

## 🎛️ **Детальные настройки полей**

### 🔍 **Left Value поле**
```
Поле: Left Value
┌─────────────────────────────────────────────┐
│ ={{ $json.subscription.isActive }}          │
│                                             │
│ 💡 Что делает:                              │
│ • Берет данные из предыдущего узла          │
│ • Ищет объект subscription                  │
│ • Проверяет свойство isActive               │
│ • Возвращает true/false                     │
└─────────────────────────────────────────────┘
```

### ⚖️ **Operator настройки**
```
Поле: Operator
┌─────────────────────────────────────────────┐
│ Type: Boolean ▼                             │
│   ├─ Equals                                 │
│   ├─ Not Equal                              │
│   ├─ Is True      ← ВЫБЕРИТЕ ЭТО            │
│   └─ Is False                               │
│                                             │
│ Operation: Is True ▼                        │
│                                             │
│ 💡 Логика:                                  │
│ • Проверяет точно: value === true          │
│ • Игнорирует "truthy" значения              │
│ • false, 0, "", null → FALSE path          │
└─────────────────────────────────────────────┘
```

### ✅ **Right Value поле**
```
Поле: Right Value
┌─────────────────────────────────────────────┐
│ (оставьте пустым)                           │
│                                             │
│ 💡 Почему пустое:                           │
│ • Operator "Is True" не требует значения    │
│ • Проверяется только левое значение         │
│ • Автоматически сравнивается с true         │
└─────────────────────────────────────────────┘
```

---

## 🧪 **Тестирование настроек**

### Тест 1: Ввод данных
```
1. Кликните "Execute Node" в Subscription Gate
2. Вставьте тестовые данные:

{
  "subscription": {
    "isActive": true,
    "endDate": "2025-12-31T00:00:00.000Z"
  },
  "userId": 123456789,
  "messageText": "test"
}

3. Ожидаемый результат: TRUE path
```

### Тест 2: Проверка условий
```
Тест различных значений:

✅ isActive: true → TRUE path
❌ isActive: false → FALSE path  
❌ isActive: null → FALSE path
❌ isActive: undefined → FALSE path
❌ isActive: "true" → FALSE path (строка, не boolean!)
❌ subscription: {} → FALSE path
```

---

## 🎨 **Визуальная схема в n8n**

```
Канвас workflow:

subscription-checker ─┐
                      │     ┌─ TRUE ──→ ai-realtor-agent
                      ├──→  │              ↓
update-transcribed ───┘     │         ai-response
                           │              ↓
                      [Subscription Gate] log-conversation
                           │              ↓  
                           └─ FALSE ─→ free-request-gate
                                          │
                                     ┌─ TRUE → ai-realtor-agent
                                     └─ FALSE → limit-exceeded
```

---

## 📝 **Checklist финальной проверки**

### ✅ Настройки узла:
- [ ] Название: "Subscription Gate"
- [ ] Тип: IF node
- [ ] Left Value: `={{ $json.subscription.isActive }}`
- [ ] Operator: Boolean → Is True
- [ ] Right Value: (пустое)
- [ ] Type Validation: Strict

### ✅ Подключения:
- [ ] **Входы**: subscription-checker + update-transcribed-message
- [ ] **TRUE выход**: к ai-realtor-agent
- [ ] **FALSE выход**: к free-request-gate

### ✅ Данные:
- [ ] subscription-checker добавляет объект subscription
- [ ] Поле isActive корректно передается
- [ ] Boolean значения обрабатываются правильно

---

## 🚨 **Распространенные ошибки в UI**

### ❌ **Ошибка 1: Неправильный тип оператора**
```
НЕПРАВИЛЬНО:
Operator: String → Equals
Right Value: "true"

ПРАВИЛЬНО:  
Operator: Boolean → Is True
Right Value: (empty)
```

### ❌ **Ошибка 2: Лишние кавычки в выражении**
```
НЕПРАВИЛЬНО:
Left Value: "={{ $json.subscription.isActive }}"

ПРАВИЛЬНО:
Left Value: ={{ $json.subscription.isActive }}
```

### ❌ **Ошибка 3: Неправильный путь**
```
НЕПРАВИЛЬНО:
={{ $json.isActive }}
={{ $json.subscription }}

ПРАВИЛЬНО:
={{ $json.subscription.isActive }}
```

---

## 🎯 **Готово!**

После правильной настройки узла Subscription Gate:
- ✅ Пользователи с подпиской идут прямо к AI
- ✅ Пользователи без подписки проверяются на лимиты  
- ✅ Логика подписки работает корректно
- ✅ Workflow оптимизирован для производительности

**Ваш Subscription Gate настроен правильно!** 🚀