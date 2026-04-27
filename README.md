# Lantern — Hybrid Restaurant Recommender

**MINE4201-01 · Taller 2 · Semester 2026-1**  
Sistema recomendador híbrido (ALS + re-ranking contextual) con UI editorial tipo revista, construido sobre el Yelp Open Dataset (Philadelphia).

---

## Cómo correrlo localmente

### Prerequisitos

- **Node.js** ≥ 18 (`node --version`)
- **Python** ≥ 3.11 (`python --version`)
- **Git**

---

### 1. Clonar e instalar

```bash
git clone https://github.com/<tu-usuario>/A-Recommender-System-for-Yelp-Reviews.git
cd A-Recommender-System-for-Yelp-Reviews
```

---

### 2. Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar — Windows
venv\Scripts\activate
# Activar — macOS/Linux
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Correr el servidor
uvicorn app.main:app --reload
```

El servidor queda en **http://localhost:8000**

Verificar que funciona:
```bash
curl http://localhost:8000/health
# {"status":"ok","model_version":"mock-0.1.0","loaded_at":"..."}

curl "http://localhost:8000/recommendations?user_id=camila&limit=3"
curl "http://localhost:8000/explanations/otello?user_id=camila"
```

> **Nota:** sin parquets, el API usa datos mock de `data/mock/`. El frontend funciona igual — ver sección "Entrenar el modelo" si quieres scores reales del ALS.

---

### 3. Frontend (Vite + React)

Abrir **una nueva terminal** (dejar el backend corriendo):

```bash
cd frontend

# Instalar dependencias
npm install

# Crear archivo de entorno
cp .env.example .env.local
# .env.local ya tiene: VITE_API_URL=http://localhost:8000

# Correr el servidor de desarrollo
npm run dev
```

La app queda en **http://localhost:5173**

Navegar entre las 5 pantallas:
- `/` — Discovery (picks del día)
- `/search` — Búsqueda con mapa
- `/business/otello` — Detalle con ExplanationCard
- `/explain` — Sliders que recomputan en vivo
- `/profile` — Perfil de usuario

---

### 4. Entrenar el modelo ALS (opcional)

Si tienes el **Yelp Open Dataset**, copia los archivos:

```
backend/data/yelp_dataset/
  yelp_academic_dataset_business.json
  yelp_academic_dataset_review.json
```

Luego desde el entorno virtual activado:

```bash
cd backend
jupyter notebook notebooks/01_train.ipynb
# Ejecutar todas las celdas (10-20 min en el subset de Philadelphia)
```

Genera:
- `data/top_n.parquet` — top-50 recomendaciones por usuario
- `data/explanations.parquet` — breakdown cf/ctx/pop por par (user, business)
- `data/eval.json` — Recall@K, NDCG@K, MAP@K

Reiniciar el backend. `GET /health` mostrará `model_version: als-0.1.0`.

> **Sin Yelp dataset:** el notebook genera datos sintéticos automáticamente (fallback). Los parquets se crean igual y el API los usa.

---

## Deploy

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# En el dashboard de Vercel, agregar env var:
# VITE_API_URL = https://<tu-url-de-cloud-run>
```

### Backend → GCP Cloud Run

```bash
cd backend

# Construir y subir imagen
gcloud builds submit --tag gcr.io/<PROJECT_ID>/lantern-api

# Desplegar (min-instances=1 para que no haya cold start durante la sustentación)
gcloud run deploy lantern-api \
  --image gcr.io/<PROJECT_ID>/lantern-api \
  --platform managed \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 3 \
  --allow-unauthenticated \
  --port 8080
```

---

## API

| Endpoint | Descripción |
|----------|-------------|
| `GET /health` | Versión del modelo + timestamp de inicio |
| `GET /businesses?city=Philadelphia&limit=50` | Lista paginada de negocios |
| `GET /businesses/:id` | Negocio individual con reviews y galería |
| `GET /categories` | Categorías con conteos |
| `GET /users/me` | Perfil mock (Camila Restrepo) |
| `GET /recommendations?user_id=camila&limit=10` | Top-N desde parquet |
| `GET /explanations/:id?user_id=camila` | Breakdown cf/ctx/pop |
| `GET /search?q=&category=&price=` | Búsqueda filtrada |

Documentación interactiva: **http://localhost:8000/docs**

---

## Arquitectura del modelo

```
Matriz interacciones  ──►  ALS (factors=64, iterations=20, alpha=10)
                                 │
                                 ▼  score CF  (0-1, normalizado)
                        Re-ranker contextual
                        (hora del día × categoría)
                                 │
                                 ▼  score CTX (0-1)
                        Prior de popularidad
                        (log review_count, normalizado)
                                 │
                                 ▼
              Híbrido = 0.60·CF + 0.25·CTX + 0.15·POP
                                 │
                        Pre-cómputo top-50/usuario
                        ──────────────────────────
                        top_n.parquet · explanations.parquet
```

El breakdown por par (user, business) alimenta la `ExplanationCard` y los sliders de la pantalla Explain que recomputan en vivo con `useMemo`.

---

## Estructura del proyecto

```
├── frontend/              Vite + React + TypeScript + Tailwind CSS
│   ├── src/pages/         Discovery · Search · Detail · Explain · Profile
│   ├── src/components/    Cards · ExplanationCard · RadarChart · StylizedMap
│   ├── src/hooks/         useApi.ts (fallback a mock si el API no responde)
│   └── vercel.json
├── backend/
│   ├── app/
│   │   ├── routers/       businesses · users · recommendations · search
│   │   ├── services/      recommender.py (carga parquets en startup)
│   │   └── models.py      Pydantic v2
│   ├── notebooks/         01_train.ipynb (pipeline ALS completo)
│   ├── data/mock/         businesses.json · categories.json · user.json
│   ├── requirements.txt
│   └── Dockerfile
└── Claude Design/         Prototipo CDN+Babel original (referencia, no modificar)
```
