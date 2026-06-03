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

# Workers=1: SVD++ model is loaded once in-process (not safe to fork after load)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
