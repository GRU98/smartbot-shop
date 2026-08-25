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

## Деплой на Debian 12 (без GitHub)

### Крок 1. Підключитись до сервера

Потрібна будь-яка SSH-програма:
- **Windows:** вбудований PowerShell або [PuTTY](https://putty.org)
- **IP сервера** та **root пароль** видає хостинг у листі після покупки

```powershell
# У PowerShell на своєму ПК:
ssh root@IP_ТВОГО_СЕРВЕРА
```

---

### Крок 2. Встановити Docker на сервері

```bash
apt update && apt upgrade -y
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
```

---

### Крок 3. Завантажити проект на сервер (без GitHub)

**Варіант A — ZIP через SCP (найпростіше)**

На своєму ПК — запакувати проект у zip (правий клік → "Надіслати в" → "Стиснута папка" або через PowerShell):

```powershell
# На своєму ПК у PowerShell:
Compress-Archive -Path "C:\Users\ivan\PycharmProjects\PythonProject666\*" -DestinationPath "C:\Users\ivan\Desktop\smartbot.zip" -Force
```

Завантажити на сервер:

```powershell
# На своєму ПК у PowerShell:
scp C:\Users\ivan\Desktop\smartbot.zip root@IP_СЕРВЕРА:/opt/smartbot.zip
```

На сервері розпакувати:

```bash
apt install -y unzip
cd /opt
unzip smartbot.zip -d smartbot
cd smartbot
```

**Варіант B — FileZilla (з графічним інтерфейсом)**

1. Завантажити [FileZilla](https://filezilla-project.org)
2. Хост: `IP сервера`, Ім'я користувача: `root`, Пароль: твій пароль, Порт: `22`
3. Перетягнути папку проекту в `/opt/smartbot/`

---

### Крок 4. Заповнити `.env` на сервері

```bash
cd /opt/smartbot
cp backend/.env.example .env
nano .env
```

Обов'язково змінити:
- **`DJANGO_SECRET_KEY`** — будь-який довгий рядок, наприклад згенерувати: `openssl rand -hex 50`
- **`PGPASSWORD`** — придумай надійний пароль для бази
- **`DJANGO_ALLOWED_HOSTS`** — `smartbotik.duckdns.org,217.160.48.54,localhost`
- **`CORS_ALLOWED_ORIGINS`** — `https://smartbotik.duckdns.org`
- **`FRONTEND_URL`** і **`BACKEND_URL`** — `https://smartbotik.duckdns.org`
- **`PREVIEW_PASSWORD`** — пароль для попереднього перегляду сайту
- **`STRIPE_*`** — ключі зі [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- **`EMAIL_*`** — SMTP дані (Gmail: увімкни [App Password](https://myaccount.google.com/apppasswords))

Зберегти: `Ctrl+O`, `Enter`, вийти: `Ctrl+X`

---

### Крок 5. Запустити

```bash
cd /opt/smartbot
docker compose up -d --build
```

Перша збірка займає 3–7 хвилин. Після цього:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Сайт вже доступний на `http://217.160.48.54`

---

### Крок 6. Домен і SSL

**Безкоштовні домени:**

| Де взяти | Домен | Як |
|---|---|---|
| [eu.org](https://nic.eu.org) | `.eu.org` | Безкоштовно, реєстрація вручну, до 2 тижнів |
| [Freenom](https://freenom.com) | `.tk` `.ml` `.ga` | Безкоштовно на 1 рік (нестабільний сервіс) |
| [DuckDNS](https://duckdns.org) | `назва.duckdns.org` | Миттєво, безкоштовно назавжди, тільки субдомен |
| [NoIP](https://noip.com) | `назва.ddns.net` | Безкоштовно, треба підтверджувати кожні 30 днів |

**Рекомендую DuckDNS** — найпростіше:
1. Зайти на [duckdns.org](https://duckdns.org) через Google-акаунт
2. Вибрати ім'я → вписати IP сервера → **Update IP**
3. Готово: `smartbot.duckdns.org` вказує на твій сервер

**Підключити SSL після домену:**

```bash
apt install -y certbot
docker compose stop frontend
certbot certonly --standalone -d smartbotik.duckdns.org
docker compose start frontend
```

Потім у `frontend/nginx.conf` додати перед закриваючим `}`:

```nginx
server {
    listen 443 ssl;
    server_name smartbotik.duckdns.org;
    ssl_certificate     /etc/letsencrypt/live/smartbotik.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartbotik.duckdns.org/privkey.pem;
    # скопіювати весь вміст з блоку listen 80
}
```

У `docker-compose.yml` для `frontend` додати порт `"443:443"` і volume `/etc/letsencrypt:/etc/letsencrypt:ro`.

```bash
docker compose up -d --build frontend
```

**Автооновлення SSL:**
```bash
echo "0 3 * * * root certbot renew --quiet && docker compose -f /opt/smartbot/docker-compose.yml restart frontend" > /etc/cron.d/certbot-smartbot
```

---

### Крок 7. Перевірка

```bash
docker compose ps                                    # всі Up
docker compose logs backend --tail=30               # немає ERROR
curl http://smartbotik.duckdns.org/api/products/?limit=1   # повертає JSON
```

---

### Оновити сайт після змін

Запакувати і завантажити знову через `scp`, потім на сервері:

```bash
cd /opt/smartbot
unzip -o /opt/smartbot_new.zip -d /opt/smartbot
docker compose up -d --build
docker compose exec backend python manage.py migrate
```

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
