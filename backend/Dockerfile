FROM python:3.11-slim

WORKDIR /app

# System deps: libgomp1 for implicit/BLAS, libsqlite3 is included in slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (layer cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App source
COPY app/ ./app/

# Runtime data artefacts only (.dockerignore excludes yelp_dataset/, real/, lantern.db, etc.)
# Total ~900MB: model_SVDpp_100.joblib (633MB) + reviews_sample.parquet (257MB) + small parquets
COPY data/ ./data/

EXPOSE 8080

# 2 workers: each handles independent requests in parallel (2× throughput for concurrent users).
# Each worker loads its own model copy (~1.5GB RAM each) → requires at least 8GB total.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
