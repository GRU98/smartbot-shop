# SmartBot Shop

Headless E-commerce платформа розумного дому.
Vite + React + TypeScript + Zustand | Django REST Framework + PostgreSQL + Redis + Stripe.

---

## Вимоги

- **Python** 3.11+ — https://python.org/downloads
- **Node.js** 20+ — https://nodejs.org
- **PostgreSQL** 15+ — https://postgresql.org/download
- **Redis** 7+ — через Docker або WSL (див. нижче)

---

## Крок 1. Встановити PostgreSQL

1. Завантажити інсталятор з https://postgresql.org/download/windows
2. При встановленні запам'ятати пароль для користувача `postgres`
3. Відкрити **pgAdmin** або **psql** і створити базу:

```sql
CREATE DATABASE smartbot;
```

---

## Крок 2. Запустити Redis

**Варіант A — Docker Desktop:**

```powershell
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Варіант B — WSL (якщо немає Docker):**

```powershell
wsl
sudo apt update && sudo apt install redis-server -y
redis-server
```

Перевірка: `redis-cli ping` → має відповісти `PONG`.

---

## Крок 3. Налаштувати Backend

### 3.1. Створити віртуальне оточення

```powershell
cd C:\Users\ivan\PycharmProjects\PythonProject666\backend

python -m venv .venv
.venv\Scripts\Activate.ps1
```

> Після активації в терміналі зʼявиться `(.venv)` на початку рядка.

### 3.2. Встановити залежності

```powershell
pip install -r requirements.txt
```

### 3.3. Файл `.env`

Файл `backend/.env` вже створений. Нижче — як заповнити порожні рядки.

#### STRIPE_WEBHOOK_SECRET

1. Встановити Stripe CLI: https://docs.stripe.com/stripe-cli
2. В терміналі:
```powershell
stripe login
stripe listen --forward-to localhost:8000/api/orders/stripe/webhook/
```
3. CLI виведе рядок типу `whsec_abc123...` — скопіювати його в `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

#### GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET

1. Перейти: https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Заповнити:
   - **Application name**: `SmartBot Shop`
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/oauth/github/callback`
3. Натиснути **Register application**
4. Скопіювати **Client ID** → `GITHUB_OAUTH_CLIENT_ID`
5. Натиснути **Generate a new client secret** → скопіювати → `GITHUB_OAUTH_CLIENT_SECRET`

#### TURNSTILE_SECRET_KEY (не обов'язково для dev)

Якщо порожньо — перевірка CAPTCHA пропускається автоматично в dev-режимі.

Для production:
1. Перейти: https://dash.cloudflare.com → **Turnstile** → **Add site**
2. Вказати домен, отримати **Site Key** (для фронту) та **Secret Key**
3. Скопіювати Secret Key → `TURNSTILE_SECRET_KEY`

### 3.4. Застосувати міграції та наповнити БД

```powershell
python manage.py migrate
python manage.py seed_db
python manage.py createsuperuser
```

- `migrate` — створює таблиці в PostgreSQL
- `seed_db` — наповнює 5 категорій та 50 товарів
- `createsuperuser` — створює адмін-акаунт (ввести email + пароль)

### 3.5. Запустити сервер

```powershell
python manage.py runserver
```

Backend працює на: **http://localhost:8000**
Адмінка: **http://localhost:8000/admin/**

---

## Крок 4. Запустити Frontend

```powershell
cd C:\Users\ivan\PycharmProjects\PythonProject666\frontend

npm install
npm run dev
```

Frontend працює на: **http://localhost:3000**

---

## Docker (альтернатива — весь стек одною командою)

```powershell
cd C:\Users\ivan\PycharmProjects\PythonProject666
cp backend/.env.example .env
# Відредагувати .env
docker compose up --build -d
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Сайт: `http://localhost` | API: `http://localhost/api/`

---

## Порядок запуску (без Docker)

1. Redis (Docker або WSL)
2. PostgreSQL (має бути запущений як сервіс)
3. Backend: `python manage.py runserver`
4. Frontend: `npm run dev`

---

## Функціональність

| Розділ | Що є |
|---|---|
| Каталог | Фільтри, сортування, пошук, пагінація |
| Товар | Галерея, характеристики, відгуки, рейтинг, порівняння |
| Кошик | Zustand + localStorage, валідація цін на бекенді |
| Оплата | Stripe Checkout, webhook, PDF рахунок на email |
| Профіль | Замовлення, статуси, скасування (24г), адреси, відгуки |
| Адмінка | Ролі (admin/moderator/editor/support), 2FA, IP whitelist, CSV/Excel експорт |
| Безпека | JWT, brute-force захист, audit log, CORS, HSTS |
