#!/usr/bin/env bash
# deploy.sh — Build y despliegue completo de Lantern (backend + frontend) en GCP
# Uso: bash deploy.sh
set -euo pipefail

PROJECT_ID="lantern-rs-26"
REGION="us-central1"
REPO="lantern-repo"
API_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/lantern-api:latest"
FRONTEND_IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/lantern-frontend:latest"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Lantern Deploy — Backend + Frontend ==="
echo "Proyecto : $PROJECT_ID"
echo "Región   : $REGION"
echo ""

gcloud config set project "$PROJECT_ID"

# ── BACKEND ──────────────────────────────────────────────────────────────────
echo "[1/4] Building backend image via Cloud Build..."
gcloud builds submit \
  --tag "$API_IMAGE" \
  --project="$PROJECT_ID" \
  --timeout=1800 \
  --machine-type=e2-highcpu-8 \
  "$SCRIPT_DIR/backend"

echo "[2/4] Deploying backend to Cloud Run..."
gcloud run deploy lantern-api \
  --image="$API_IMAGE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --memory=16Gi \
  --cpu=8 \
  --min-instances=1 \
  --max-instances=3 \
  --timeout=300 \
  --concurrency=20 \
  --set-env-vars="JWT_SECRET=lantern-prod-2026-mine4201,PHOTOS_BASE_URL=https://storage.googleapis.com/lantern-photos-rs26" \
  --allow-unauthenticated \
  --port=8080

API_URL=$(gcloud run services describe lantern-api \
  --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

echo "  Backend URL: $API_URL"

# ── FRONTEND ─────────────────────────────────────────────────────────────────
echo "[3/4] Building frontend image via Cloud Build (bakes API URL)..."
# Pass VITE_API_URL as a Docker build-arg via an inline cloudbuild config.
# (gcloud builds submit --tag does not support --build-arg directly.)
cat > /tmp/lantern-frontend-cloudbuild.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - build
      - '--build-arg'
      - 'VITE_API_URL=$API_URL'
      - '-t'
      - '$FRONTEND_IMAGE'
      - '.'
images:
  - '$FRONTEND_IMAGE'
EOF
gcloud builds submit \
  --config=/tmp/lantern-frontend-cloudbuild.yaml \
  --project="$PROJECT_ID" \
  --timeout=900 \
  "$SCRIPT_DIR/frontend"

echo "[4/4] Deploying frontend to Cloud Run..."
gcloud run deploy lantern-frontend \
  --image="$FRONTEND_IMAGE" \
  --platform=managed \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=30 \
  --allow-unauthenticated \
  --port=8080

FRONTEND_URL=$(gcloud run services describe lantern-frontend \
  --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")

# Allow frontend URL in backend CORS
echo "  Updating backend CORS to allow frontend..."
gcloud run services update lantern-api \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --update-env-vars="ALLOWED_ORIGINS=$FRONTEND_URL"

echo ""
echo "=== Deploy completo ==="
echo "Backend  : $API_URL"
echo "Frontend : $FRONTEND_URL"
echo "Docs     : $API_URL/docs"
