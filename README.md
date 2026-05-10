# Lantern — Hybrid Restaurant Recommender

**MINE4201-01 · Taller 2 · Semester 2026-1**

Sistema recomendador híbrido (SVD++ collaborative filtering + re-ranking contextual por hora del día) con interfaz editorial tipo revista, construido sobre el Yelp Open Dataset (10 ciudades de EE.UU. y Canadá).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite · React · TypeScript · Tailwind CSS |
| Backend | FastAPI · Pydantic v2 · Python 3.11 |
| Modelo CF | SVD++ (scikit-surprise, n_factors=25, n_epochs=30) |
| Modelo cold-start | TF-IDF + popularidad bayesiana (scikit-learn) |
| Auth | JWT (python-jose) |
| Deploy | Vercel (frontend) · GCP Cloud Run (backend) |

---

## Correr localmente

### Requisitos

- Node.js ≥ 18
- Python ≥ 3.11
- Git

### 1. Clonar

```bash
git clone https://github.com/ErichGiusseppe/A-Recommender-System-for-Yelp-Reviews.git
cd A-Recommender-System-for-Yelp-Reviews
```

### 2. Modelo SVD++ (requerido para generate_parquets.py)

El modelo entrenado no se sube a git por su tamaño (~664 MB). Cópialo desde la carpeta compartida del proyecto:

```
taller 2/Modelos/Modelos_SVD_100/model_SVDpp_100.joblib
            ↓
backend/data/models/model_SVDpp_100.joblib
```

Sin este archivo, `generate_parquets.py` cae en modo ALS automáticamente (fallback).

### 3. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Servidor en **http://localhost:8000** — verificar:

```bash
curl http://localhost:8000/health
# {"status":"ok","model_version":"svdpp-hybrid-50f-als-coldstart","loaded_at":"..."}
```

### 4. Frontend

En una terminal nueva (con el backend corriendo):

```bash
cd frontend
npm install

# Crear archivo de entorno
echo "VITE_API_URL=http://localhost:8000" > .env.local

npm run dev
```

App en **http://localhost:5173**

| Ruta | Pantalla |
|------|---------|
| `/` | Discovery — picks del día por ciudad |
| `/search` | Búsqueda con filtros y mapa interactivo |
| `/business/:id` | Detalle con ExplanationCard |
| `/explain` | Sliders que recomputan el ranking en vivo |
| `/profile` | Perfil y lugares guardados |

---

## Arquitectura del modelo

```
Pre-filtro (generate_parquets.py — se corre una vez)
  ciudad + is_open + excluir vistos → ~7k candidatos por usuario
        │
        ▼
  SVD++ predict(user_id, biz_id)    [score 1–5 → normalizado 0–1]
        │
        ▼  cf_norm
  Prior de popularidad              log(review_count), MinMax
        │
        ▼  pop_score
  Contexto neutro (hora=15)         boost de categoría [1.0–1.5]
        │
        ▼  ctx_score
  score_híbrido = 0.60·CF + 0.25·CTX + 0.15·POP
        │
  top-100 por usuario → top_n.parquet · explanations.parquet
  ──────────────────────────────────────────────────────────
  Re-ranking contextual (request time — O(n), instantáneo)
    hora actual → boost por categoría → reordenar top-100
```

El breakdown `(cf, ctx, pop)` por par `(usuario, negocio)` alimenta la `ExplanationCard` y los sliders de la pantalla Explain.

### Datos del modelo

| Métrica | Valor |
|---------|-------|
| Algoritmo CF | SVD++ (scikit-surprise) |
| Factores | 25 |
| Épocas | 30 |
| RMSE | 1.28 |
| Ciudades | 10 (Philadelphia, Tucson, Tampa, Indianapolis, Nashville, New Orleans, Reno, Edmonton, Saint Louis, Santa Barbara) |
| Usuarios warm | 1 740 000+ |
| Negocios | 150 000+ |
| Usuarios demo con SVD++ | 7 (camila, daniel, sara, alex, maria, carlos, sofia) |
| Cold-start | TF-IDF cosine + popularidad bayesiana |

### Generar los parquets (requiere Yelp Open Dataset + modelo SVD++)

Coloca los archivos en:

```
backend/data/yelp_dataset/
  yelp_academic_dataset_business.json
  yelp_academic_dataset_review.json

backend/data/models/
  model_SVDpp_100.joblib
```

Luego:

```bash
cd backend
python generate_parquets.py
```

Genera `data/top_n.parquet`, `data/explanations.parquet`, `data/business_meta.parquet`, `data/eval.json`. Reinicia el backend.

---

## Sincronizar historial (para compañeros de equipo)

Si el historial remoto fue reescrito (rebase o filter-branch), usa este script para sincronizar sin perder tu trabajo local:

```bash
bash << 'EOF'
set -e
UNPUSHED=$(git log --reverse --format="%H" origin/main..HEAD)
if ! git diff --quiet || ! git diff --cached --quiet; then
  git stash push -m "sync-stash" --include-untracked
  STASHED=1
fi
git fetch origin
git reset --hard origin/main
if [ -n "$UNPUSHED" ]; then
  echo "$UNPUSHED" | while read hash; do git cherry-pick "$hash"; done
fi
if [ "${STASHED:-0}" = "1" ]; then git stash pop; fi
echo "✓ Listo"
EOF
```

---

## API

Documentación interactiva: **http://localhost:8000/docs**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/health` | Versión del modelo y timestamp |
| `POST` | `/auth/login` | Login → JWT token |
| `POST` | `/auth/logout` | Invalidar sesión |
| `GET` | `/auth/me` | Usuario autenticado |
| `GET` | `/businesses` | Lista paginada (`city`, `limit`, `offset`) |
| `GET` | `/businesses/{id}` | Negocio individual con reviews |
| `GET` | `/categories` | Categorías disponibles |
| `GET` | `/recommendations` | Top-N desde parquet (`user_id`, `city`, `limit`) |
| `GET` | `/explanations/{id}` | Breakdown cf/ctx/pop por par usuario-negocio |
| `GET` | `/search` | Búsqueda filtrada (`q`, `category`, `price`, `city`) |

---

## Estructura

```
├── frontend/
│   ├── src/
│   │   ├── pages/          Discovery · Search · Detail · Explain · Profile · Login
│   │   ├── components/     Cards · ExplanationCard · RadarChart · StylizedMap · NeighborhoodPicker
│   │   ├── contexts/       AuthContext · NeighborhoodContext
│   │   ├── hooks/          useApi.ts
│   │   └── lib/            api.ts
│   └── vercel.json
└── backend/
    ├── app/
    │   ├── routers/        businesses · users · recommendations · search · auth
    │   ├── services/       recommender.py · business_store.py · contextual_scorer.py
    │   └── models.py
    ├── data/               (ignorado en git — dataset Yelp + artefactos + modelos)
    │   └── models/         model_SVDpp_100.joblib  ← copiar aquí
    ├── generate_parquets.py
    ├── requirements.txt
    └── Dockerfile
```

---

## Deploy

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Agregar variable de entorno en el dashboard:
# VITE_API_URL = https://<url-de-cloud-run>
```

### Backend → GCP Cloud Run

```bash
cd backend
gcloud builds submit --tag gcr.io/<PROJECT_ID>/lantern-api
gcloud run deploy lantern-api \
  --image gcr.io/<PROJECT_ID>/lantern-api \
  --platform managed \
  --region us-central1 \
  --min-instances 1 \
  --allow-unauthenticated \
  --port 8080
```
