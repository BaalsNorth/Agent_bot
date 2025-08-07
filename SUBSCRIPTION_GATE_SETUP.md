# 🔧 Настройка Subscription Gate (IF узел)

## 🎯 **Назначение узла**

**Subscription Gate** проверяет статус подписки пользователя и направляет поток данных:
- ✅ **True** → Пользователь с активной подпиской → прямо к AI Agent
- ❌ **False** → Пользователь без подписки → к проверке бесплатных лимитов

---

## ⚙️ **Параметры конфигурации**

### 1. **Основные настройки (Parameters)**

```json
{
  "conditions": {
    "options": {
      "caseSensitive": false,
      "leftValue": "",
      "typeValidation": "strict"
    },
    "conditions": [
      {
        "leftValue": "={{ $json.subscription.isActive }}",
        "rightValue": "true",
        "operator": {
          "type": "boolean",
          "operation": "true"
        }
      }
    ]
  },
  "options": {}
}
```

### 2. **Пошаговая настройка в n8n UI**

#### Шаг 1: Выберите тип узла
- Добавьте узел **"IF"** 
- Назовите его `Subscription Gate`

#### Шаг 2: Настройте условие
1. **Left Value**: `={{ $json.subscription.isActive }}`
2. **Operator**: `Boolean` → `Is True`
3. **Right Value**: (оставьте пустым, так как используем Boolean Is True)

#### Шаг 3: Дополнительные опции
- **Case Sensitive**: `false` (не важно для boolean)
- **Type Validation**: `strict` (строгая проверка типов)

---

## 📊 **Подробная конфигурация**

### 🔍 **Left Value (Левое значение)**
```javascript
={{ $json.subscription.isActive }}
```

**Что это проверяет:**
- Получает данные из узла `subscription-checker`
- Ищет поле `subscription.isActive`
- Ожидает boolean значение: `true` или `false`

### ⚖️ **Operator (Оператор)**
- **Тип**: `Boolean`
- **Операция**: `Is True`
- **Логика**: Проверяет, является ли значение `true`

### ✅ **Результат проверки**
- **True path** → `$json.subscription.isActive === true`
- **False path** → `$json.subscription.isActive === false` или `undefined`

---

## 🛠️ **Альтернативные варианты настройки**

### Вариант 1: Строгая проверка даты
```javascript
// Left Value
={{ new Date($json.subscription.endDate) > new Date() }}

// Operator: Boolean → Is True
```

### Вариант 2: Проверка типа подписки
```javascript
// Left Value  
={{ $json.subscription.type }}

// Operator: String → Equals
// Right Value: premium
```

### Вариант 3: Комплексная проверка
```javascript
// Left Value
={{ $json.subscription.isActive && new Date($json.subscription.endDate) > new Date() }}

// Operator: Boolean → Is True
```

---

## 🔗 **Входящие данные**

Узел получает данные от двух источников:

### 1. От `subscription-checker` (команды)
```json
{
  "userId": 123456789,
  "chatId": 123456789,
  "username": "user123",
  "firstName": "Иван",
  "messageText": "/start",
  "command": "/start",
  "subscription": {
    "isActive": true,
    "endDate": "2025-12-31T00:00:00.000Z",
    "freeRequestsUsed": 0,
    "maxFreeRequests": 10,
    "canUseFreeRequests": false
  }
}
```

### 2. От `update-transcribed-message` (голос)
```json
{
  "userId": 123456789,
  "chatId": 123456789,
  "messageText": "Привет, как дела с квартирой?",
  "messageType": "text",
  "subscription": {
    "isActive": false,
    "endDate": "2025-12-31T00:00:00.000Z",
    "freeRequestsUsed": 3,
    "maxFreeRequests": 10,
    "canUseFreeRequests": true
  }
}
```

---

## ↗️ **Исходящие соединения**

### ✅ **True branch** → `ai-realtor-agent`
**Когда срабатывает:**
- `subscription.isActive === true`
- Пользователь имеет активную подписку
- Безлимитный доступ к AI

**Данные передаются как есть** к AI Agent

### ❌ **False branch** → `free-request-gate`
**Когда срабатывает:**
- `subscription.isActive === false`
- `subscription.isActive === undefined`
- Пользователь без подписки

**Данные передаются** для проверки бесплатных лимитов

---

## 🧪 **Тестирование узла**

### Тест 1: Активная подписка
```json
// Входные данные
{
  "subscription": {
    "isActive": true
  }
}

// Ожидаемый результат: True branch
```

### Тест 2: Неактивная подписка
```json
// Входные данные
{
  "subscription": {
    "isActive": false
  }
}

// Ожидаемый результат: False branch
```

### Тест 3: Отсутствие данных
```json
// Входные данные
{
  "subscription": {}
}

// Ожидаемый результат: False branch
```

---

## 🚨 **Частые ошибки и решения**

### ❌ **Ошибка 1: Неправильный путь к данным**
```javascript
// НЕПРАВИЛЬНО
={{ $json.isActive }}

// ПРАВИЛЬНО  
={{ $json.subscription.isActive }}
```

### ❌ **Ошибка 2: Строковое сравнение вместо boolean**
```javascript
// НЕПРАВИЛЬНО
Left Value: ={{ $json.subscription.isActive }}
Operator: String → Equals
Right Value: "true"

// ПРАВИЛЬНО
Left Value: ={{ $json.subscription.isActive }}
Operator: Boolean → Is True
```

### ❌ **Ошибка 3: Обработка null/undefined**
```javascript
// ПРОБЛЕМА: Если subscription.isActive = null
// РЕШЕНИЕ: Добавить проверку
={{ $json.subscription.isActive === true }}
```

---

## 🔧 **Отладка узла**

### Включите debug режим:
1. Запустите workflow в test режиме
2. Проверьте входящие данные в Subscription Gate
3. Убедитесь что `subscription.isActive` существует
4. Проверьте какой путь выбирается (True/False)

### Полезные выражения для отладки:
```javascript
// Проверить структуру данных
={{ Object.keys($json) }}

// Проверить значение подписки
={{ $json.subscription }}

// Проверить тип значения
={{ typeof $json.subscription.isActive }}
```

---

## 📋 **Финальная конфигурация (Copy-Paste)**

```json
{
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": false,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "leftValue": "={{ $json.subscription.isActive }}",
          "rightValue": "true",
          "operator": {
            "type": "boolean",
            "operation": "true"
          }
        }
      ]
    },
    "options": {}
  },
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.2,
  "position": [200, 400],
  "id": "subscription-gate",
  "name": "Subscription Gate"
}
```

---

## ✅ **Проверочный список**

- [ ] Узел называется `Subscription Gate`
- [ ] Тип узла: `IF` (n8n-nodes-base.if)
- [ ] Left Value: `={{ $json.subscription.isActive }}`
- [ ] Operator: Boolean → Is True
- [ ] Type Validation: strict
- [ ] True branch → соединен с `ai-realtor-agent`
- [ ] False branch → соединен с `free-request-gate`
- [ ] Узел получает данные от `subscription-checker` и `update-transcribed-message`

**После правильной настройки узел будет корректно разделять пользователей по типу подписки!** 🎯