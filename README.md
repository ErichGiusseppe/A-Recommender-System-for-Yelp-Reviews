# Lantern — Hybrid Restaurant Recommender

**MINE4201-01 · Taller 2 · Semester 2026-1**

Sistema recomendador híbrido (ALS collaborative filtering + re-ranking contextual) con interfaz editorial tipo revista, construido sobre el Yelp Open Dataset (10 ciudades de EE.UU. y Canadá).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite · React · TypeScript · Tailwind CSS |
| Backend | FastAPI · Pydantic v2 · Python 3.11 |
| Modelo | implicit ALS · scikit-learn · pandas · numpy |
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

### 2. Backend

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
# {"status":"ok","model_version":"als-hybrid-50f-20it","loaded_at":"..."}
```

### 3. Frontend

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
| `/search` | Búsqueda con mapa interactivo |
| `/business/:id` | Detalle con ExplanationCard |
| `/explain` | Sliders que recomputan el ranking en vivo |
| `/profile` | Perfil y lugares guardados |

---

## Modelo híbrido

```
Yelp interactions (4.2M reviews, 10 ciudades)
        │
        ▼
  ALS implícito  (factors=50, iterations=20, α=10)
        │
        ▼  score_cf  [0, 1] normalizado
  Re-ranker contextual  (hora del día × categoría)
        │
        ▼  score_ctx  [0, 1]
  Prior de popularidad  (log review_count, MinMax)
        │
        ▼  score_pop  [0, 1]
        │
  score_híbrido = 0.60·CF + 0.25·CTX + 0.15·POP
        │
  Pre-cómputo top-50 por usuario
  ────────────────────────────────
  top_n.parquet · explanations.parquet
```

El breakdown `(cf, ctx, pop)` por par `(usuario, negocio)` alimenta la `ExplanationCard` y los sliders de la pantalla Explain, que recalculan el ranking en tiempo real con `useMemo`.

### Datos del modelo entrenado

| Métrica | Valor |
|---------|-------|
| Ciudades | 10 (Philadelphia, Tucson, Tampa, Indianapolis, Nashville, New Orleans, Reno, Edmonton, Saint Louis, Santa Barbara) |
| Reviews cargados | 6 990 280 |
| Reviews warm (≥5 por usuario y negocio) | 4 202 482 |
| Usuarios warm | 287 116 |
| Negocios warm | 101 270 |
| Factores ALS | 50 |
| Iteraciones | 20 |
| Usuarios demo | 13 (camila, daniel, sara, alex, maria, carlos, sofia, diego, lucas, ana, pedro, luna, marcos) |

### Entrenar el modelo (requiere Yelp Open Dataset)

Coloca los archivos JSON en:

```
backend/data/yelp_dataset/
  yelp_academic_dataset_business.json
  yelp_academic_dataset_review.json
```

Luego:

```bash
cd backend
python generate_parquets.py
```

Genera `data/top_n.parquet`, `data/explanations.parquet`, `data/business_meta.parquet`, `data/eval.json`. Reinicia el backend.

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
    │   ├── services/       recommender.py · business_store.py
    │   └── models.py
    ├── notebooks/          01_train.ipynb
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
