# Русская версия предложения MAX + Dikidi: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить два связанных русскоязычных документа: прямое предложение совместного пилота MAX + Dikidi и техническое приложение с проверяемым описанием архитектуры, отказоустойчивости, безопасности и масштабирования.

**Architecture:** Основной документ объясняет продуктовую проблему, ценность и формат пилота без перегрузки инфраструктурными деталями. Техническое приложение раскрывает транспортный runtime, интеграционный gateway, модель идентификации, гарантии обработки, переход к webhook и размещение внутри инфраструктуры Dikidi, с опорой на `STANDARD.md` и существующие нормативные контракты.

**Tech Stack:** Markdown, MAX Bot Platform Standard v1, Redis 7 contracts, long polling в текущем пилоте, webhook как целевая эволюция, официальный API Dikidi как целевой интеграционный контракт.

## Global Constraints

- Документы пишутся на русском языке.
- Основной файл: `MAX-DIKIDI-INTEGRATION-PROPOSAL.md`.
- Техническое приложение: `docs/integrations/max-dikidi-reference-architecture.md`.
- Не упоминать администраторского бота и другие части MAX-DKD вне клиентского API-контура.
- Не раскрывать внутренние обходные детали пилотной доставки подтверждения.
- Не утверждать знание внутренней физической схемы БД Dikidi.
- Не выдавать webhook за уже реализованный транспорт пилота.
- Не обещать exactly-once между MAX и Dikidi.
- Тон спокойный, деловой, без претензий к Dikidi.
- Целевая модель предполагает передачу решения и развёртывание в инфраструктуре Dikidi.
- Юридические документы в первом сообщении бота указываются обычными гиперссылками, без отдельных кнопок.
- Документы завершаются предложением: sandbox + документация API + совместная архитектурная сессия.

---

### Task 1: Подготовить основное предложение

**Files:**
- Create: `MAX-DIKIDI-INTEGRATION-PROPOSAL.md`

**Interfaces:**
- Consumes: дизайн `docs/superpowers/specs/2026-07-30-max-dikidi-integration-proposal-design.md`.
- Produces: самостоятельный документ для продуктового руководителя и технического лида со ссылкой на техническое приложение.

- [ ] **Step 1: Написать основное предложение**

Включить разделы: предложение, источник инициативы, проблема односторонних уведомлений, пользовательский сценарий, реализованный пилот, целевая архитектура, ценность, масштабирование, формат пилота, запрос к Dikidi, следующий шаг.

- [ ] **Step 2: Проверить тон и границы утверждений**

Проверить отсутствие обвинительных формулировок, упоминаний внутреннего обходного механизма, утверждений об официальности текущего endpoint, обещаний exactly-once и заявлений о знании внутренней БД Dikidi.

- [ ] **Step 3: Проверить связь с техническим приложением**

Убедиться, что основной документ ссылается на `docs/integrations/max-dikidi-reference-architecture.md` и не дублирует его целиком.

- [ ] **Step 4: Commit**

```bash
git add MAX-DIKIDI-INTEGRATION-PROPOSAL.md
git commit -m "docs: add Russian MAX Dikidi pilot proposal"
```

### Task 2: Подготовить техническое приложение

**Files:**
- Create: `docs/integrations/max-dikidi-reference-architecture.md`

**Interfaces:**
- Consumes: `STANDARD.md`, нормативные контракты MAX-BOT-PLATFORM и согласованный дизайн.
- Produces: технический архитектурный паспорт для backend/platform-команды Dikidi.

- [ ] **Step 1: Описать scope, компоненты и потоки**

Включить клиентский бот, transport runtime, integration gateway, MAX, официальный API Dikidi и минимальное техническое состояние. Описать потоки start/contact, получение записей, напоминание, действие пользователя и результат.

- [ ] **Step 2: Описать пилотную зеркальную модель и целевой API**

Зафиксировать, что модель построена по фактически наблюдаемому контракту, не вводит произвольных бизнес-сущностей и не заявляется как внутренняя физическая схема Dikidi. Указать, что в целевой реализации бизнес-зеркало не требуется.

- [ ] **Step 3: Описать надёжность**

Включить at-least-once, stable event ID, дедупликацию, durable queues, retries, Retry-After, dead letter, leases, fencing, Redis loss, graceful shutdown, partial-success handling и границы гарантий.

- [ ] **Step 4: Описать long polling и webhook evolution**

Честно обозначить long polling как текущий проверенный транспорт и webhook как следующий этап, сохраняющий общие application handlers и контракты надёжности.

- [ ] **Step 5: Описать безопасность, данные и эксплуатацию**

Включить verified self-contact, least privilege, минимизацию данных, безопасные логи, health, метрики, изоляцию нагрузки, развёртывание в инфраструктуре Dikidi и гиперссылки на документы Dikidi в первом сообщении.

- [ ] **Step 6: Добавить failure matrix и план пилота**

Матрица должна покрывать недоступность MAX, Redis, API Dikidi, 429, дубли, рестарты, истёкшие leases, постоянные ошибки и частично выполненные операции. План пилота: архитектурная сессия, sandbox, закрытая группа компаний, техническая оценка, решение о промышленной реализации.

- [ ] **Step 7: Commit**

```bash
git add docs/integrations/max-dikidi-reference-architecture.md
git commit -m "docs: add Russian MAX Dikidi reference architecture"
```

### Task 3: Финальная сверка комплекта

**Files:**
- Verify: `MAX-DIKIDI-INTEGRATION-PROPOSAL.md`
- Verify: `docs/integrations/max-dikidi-reference-architecture.md`
- Verify: `STANDARD.md`

**Interfaces:**
- Consumes: оба подготовленных документа и нормативный стандарт.
- Produces: согласованный комплект без противоречий и незаполненных мест.

- [ ] **Step 1: Проверить полноту дизайна**

Сверить оба файла со всеми разделами спецификации, включая модель размещения, webhook, пользовательские документы, минимальное состояние, failure matrix и границы утверждений.

- [ ] **Step 2: Выполнить placeholder scan**

Проверить отсутствие `TBD`, `TODO`, фиктивных ссылок, незаполненных чисел пилота и обещаний будущей реализации как уже существующей.

- [ ] **Step 3: Проверить нормативную точность**

Сверить формулировки про marker, polling ownership, durable enqueue, idempotency, retries, dead letter, health, redaction и graceful shutdown с `STANDARD.md`.

- [ ] **Step 4: Проверить читаемость**

Основной документ должен быть понятен без знания репозиториев MAX-DKD; техническое приложение должно давать проверяемые ответы техлиду без необходимости читать исходный код.

- [ ] **Step 5: Commit финальных правок**

```bash
git add MAX-DIKIDI-INTEGRATION-PROPOSAL.md docs/integrations/max-dikidi-reference-architecture.md
git commit -m "docs: finalize Russian MAX Dikidi proposal package"
```
