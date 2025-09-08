# ---- Backend: FastAPI + Uvicorn ----
FROM python:3.11-slim

WORKDIR /app

# Evita bytecode y buffer en logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Sistema mínimo y dependencias
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código
COPY . .

# Puerto interno del backend
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Arranque del backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]