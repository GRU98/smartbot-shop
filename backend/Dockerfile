FROM python:3.11-slim-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.11-slim-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libpq5 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libcairo2 \
        fonts-dejavu-core && \
    GDK=$(apt-cache pkgnames | grep -E '^libgdk-pixbuf' | grep -v xlib | grep -E -- '-0$' | head -n 1) && \
    [ -z "$GDK" ] || apt-get install -y --no-install-recommends "$GDK" && \
    FFI=$(apt-cache pkgnames | grep -E '^libffi[0-9]+$' | head -n 1) && \
    [ -z "$FFI" ] || apt-get install -y --no-install-recommends "$FFI" && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

RUN useradd --create-home --shell /bin/bash appuser

WORKDIR /app

COPY . .

RUN mkdir -p /app/media /app/staticfiles /app/templates \
    && chown -R appuser:appuser /app \
    && find /app -type d -exec chmod 755 {} \; \
    && find /app -type f -exec chmod 644 {} \;

USER appuser

RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
