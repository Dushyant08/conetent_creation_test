# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci --quiet
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python runtime ───────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY main.py .
COPY routers/ ./routers/
COPY services/ ./services/

# Bake bike/color assets into the image (override at runtime via AZURE_BLOB_URL)
COPY assets/segments/ ./assets/segments/
COPY assets/backgrounds/ ./assets/backgrounds/

# Copy built frontend
COPY --from=frontend-builder /build/dist ./frontend/dist

# outputs dir for generated images (mount a volume or Azure File Share for persistence)
RUN mkdir -p outputs

# Azure App Service / Container Apps sets PORT at runtime; default 8000
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
