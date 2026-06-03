#!/usr/bin/env bash
# teardown.sh — Elimina todos los recursos GCP de Lantern
# Uso: bash teardown.sh
# ADVERTENCIA: irreversible. Elimina Cloud Run, Artifact Registry y el proyecto completo.
set -euo pipefail

PROJECT_ID="lantern-rs-26"
REGION="us-central1"

echo "=== Lantern Teardown ==="
echo "ADVERTENCIA: se eliminarán TODOS los recursos del proyecto $PROJECT_ID"
echo "  - Cloud Run: lantern-api, lantern-frontend"
echo "  - Artifact Registry: lantern-repo (todas las imágenes)"
echo "  - Proyecto GCP: $PROJECT_ID"
read -r -p "¿Confirmar? (escribe 'SI' para continuar): " confirm
if [[ "$confirm" != "SI" ]]; then
  echo "Cancelado."
  exit 0
fi

gcloud config set project "$PROJECT_ID"

echo "[1/3] Eliminando Cloud Run services..."
for SERVICE in lantern-api lantern-frontend; do
  gcloud run services delete "$SERVICE" \
    --region="$REGION" --project="$PROJECT_ID" --quiet 2>/dev/null \
    && echo "  $SERVICE eliminado" || echo "  $SERVICE no existía"
done

echo "[2/3] Eliminando Artifact Registry repo..."
gcloud artifacts repositories delete lantern-repo \
  --location="$REGION" --project="$PROJECT_ID" --quiet 2>/dev/null \
  && echo "  Repositorio eliminado" || echo "  Repositorio no existía"

echo "[3/3] Eliminando proyecto GCP '$PROJECT_ID'..."
gcloud projects delete "$PROJECT_ID" --quiet
echo "  Proyecto eliminado"

echo ""
echo "=== Teardown completo. Todos los recursos de Lantern han sido eliminados. ==="
