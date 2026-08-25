import os
from datetime import timedelta
from flask import Flask, request, make_response, redirect

app = Flask(__name__)

PREVIEW_PASSWORD = os.getenv("PREVIEW_PASSWORD", "123456789")
COOKIE_NAME = "preview_token"
COOKIE_MAX_AGE = int(timedelta(days=2).total_seconds())
TOKEN = "smartbot-preview-ok"

LOGIN_HTML = """<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SmartBot — Доступ</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0a;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  .card {
    background: #111;
    border: 1px solid #222;
    border-radius: 16px;
    padding: 40px 36px;
    width: 100%;
    max-width: 360px;
  }
  h1 { color: #fff; font-size: 20px; font-weight: 700; margin-bottom: 6px; }
  p { color: #666; font-size: 14px; margin-bottom: 28px; }
  label { display: block; color: #999; font-size: 13px; margin-bottom: 6px; }
  input[type=password] {
    width: 100%;
    padding: 11px 14px;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    color: #fff;
    font-size: 15px;
    outline: none;
    transition: border-color .15s;
  }
  input[type=password]:focus { border-color: #555; }
  button {
    margin-top: 16px;
    width: 100%;
    padding: 11px;
    background: #fff;
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background .15s;
  }
  button:hover { background: #e5e5e5; }
  .error {
    margin-top: 12px;
    color: #f87171;
    font-size: 13px;
    text-align: center;
  }
</style>
</head>
<body>
<div class="card">
  <h1>SmartBot Shop</h1>
  <p>Сайт на стадії тестування</p>
  <form method="POST">
    <input type="hidden" name="next" value="{{ next }}">
    <label>Пароль для доступу</label>
    <input type="password" name="password" placeholder="••••••••••" autofocus>
    <button type="submit">Увійти</button>
    {% if error %}<div class="error">{{ error }}</div>{% endif %}
  </form>
</div>
</body>
</html>"""


@app.route("/check")
def check():
    token = request.cookies.get(COOKIE_NAME)
    if token == TOKEN:
        return "", 200
    return "", 401


@app.route("/login", methods=["GET", "POST"])
def login():
    next_url = request.args.get("next") or request.form.get("next") or "/"
    error = ""

    if request.method == "POST":
        password = request.form.get("password", "")
        if password == PREVIEW_PASSWORD:
            resp = make_response(redirect(next_url))
            resp.set_cookie(
                COOKIE_NAME,
                TOKEN,
                max_age=COOKIE_MAX_AGE,
                httponly=True,
                secure=True,
                samesite="Lax",
            )
            return resp
        error = "Невірний пароль"

    html = LOGIN_HTML.replace("{{ next }}", next_url)
    html = html.replace("{% if error %}<div class=\"error\">{{ error }}</div>{% endif %}",
                        f'<div class="error">{error}</div>' if error else "")
    return html, 200 if not error else 401


@app.route("/logout")
def logout():
    resp = make_response(redirect("/preview-login"))
    resp.delete_cookie(COOKIE_NAME)
    return resp


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
