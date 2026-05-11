# Lantern — Hybrid Restaurant Recommender

**MINE4201-01 · Taller 2 · Semester 2026-1**

Sistema recomendador híbrido (SVD++ + re-ranking contextual + cold-start con content model + folding-in en tiempo real) con interfaz editorial tipo revista, construido sobre el Yelp Open Dataset (10 ciudades de EE.UU. y Canadá).

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite · React · TypeScript · Tailwind CSS |
| Backend | FastAPI · Pydantic v2 · Python 3.11 |
| Modelo CF | SVD++ (scikit-surprise, n_factors=25, n_epochs=30, RMSE 1.28) |
| Cold-start | TF-IDF cosine + popularidad bayesiana (scikit-learn) |
| Folding-in | Mínimos cuadrados sobre factores latentes SVD++ (numpy lstsq) |
| Auth | JWT (python-jose) |
| Persistencia | SQLite (usuarios, reviews, preferencias cold-start) |
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

### 2. Modelo SVD++ (requerido para generate_parquets.py y folding-in)

El modelo entrenado no se sube a git por su tamaño (~664 MB). Descárgalo desde Google Drive:

**[Descargar modelo desde Drive](https://drive.google.com/drive/folders/1_9qooLuNrQnt3MnrzO8PvMfUHRNtlpWL)**

Crea la carpeta y coloca el archivo ahí:

```bash
mkdir -p backend/data/models
# Luego mueve el archivo descargado:
mv ~/Downloads/model_SVDpp_100.joblib backend/data/models/model_SVDpp_100.joblib
```

La estructura debe quedar así:

```
backend/data/models/
  model_SVDpp_100.joblib   ← aquí
```

Sin este archivo, `generate_parquets.py` cae en modo ALS automáticamente y el folding-in queda desactivado (las recomendaciones siguen funcionando con los parquets pre-computados).

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
# {"status":"ok","model_version":"als-hybrid-0.1.0","loaded_at":"..."}
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
| `/` | Discovery — picks del día personalizados por ciudad |
| `/search` | Búsqueda con filtros (texto, categoría, precio) |
| `/business/:id` | Detalle con reviews, fotos, ExplanationCard y rating |
| `/profile` | Perfil y lugares guardados |
| `/login` | Login y registro |

---

## Arquitectura del modelo

### Pipeline completo

```
generate_parquets.py  (batch — se corre una vez)
─────────────────────────────────────────────────
  1. PRE-FILTRO
     todas las ciudades + is_open + excluir vistos → ~7k candidatos/usuario

  2. SVD++ SCORING (vectorizado con numpy)
     scores = mu + bu + bi + qi @ (pu + yj_impl)  [1–5 → norm 0–1]

  3. HYBRID SCORE
     score = 0.60·CF + 0.25·CTX_neutro + 0.15·POP

  4. ARTEFACTOS
     top-100/usuario → top_n.parquet
     breakdown cf/ctx/pop → explanations.parquet
     metadatos negocios + ciudad → business_meta.parquet
     top-10 reviews por negocio → reviews_sample.parquet
     content model → content_model.joblib
─────────────────────────────────────────────────
inject_scores()  (request time — O(n), instantáneo)
  Prioridad de score (de mayor a menor):

  1. Folding-in     usuario tiene reviews propias → actualiza p_u con lstsq
  2. Personal       SVD++ pre-computado en parquet
  3. Cold-start     perfil del wizard → TF-IDF cosine filtrado por ciudad
  4. Popularidad    new_visitor|ciudad → fallback bayesiano
─────────────────────────────────────────────────
  Re-ranking contextual (hora actual)
    hora → TIME_CONTEXT → boost por categoría [1.0–1.5] → reordenar
```

### Folding-in (Brand 2006)

Cuando un usuario califica un negocio, su vector latente `p_u` se actualiza en tiempo real sin reentrenar el modelo:

```
residuo: r_i = stars_i - mu - bu - bi - qi · u_impl
sistema: argmin_p_u || Q · p_u - r ||²  (numpy lstsq)
```

Los negocios ya calificados se excluyen de las recomendaciones. Los scores nuevos entran al pipeline normal (contextual re-ranking incluido).

### Cold-start (wizard de preferencias)

Para usuarios sin historial:

1. Wizard de 4 pasos al entrar: categorías (desde datos reales), ocasión, hora, precio.
2. Perfil guardado en SQLite (`user_preferences`).
3. En cada request a `/businesses`, el backend convierte el perfil a query TF-IDF y devuelve scores filtrados por ciudad.
4. En Discovery, los 4 "top picks" también usan el content model filtrado a la ciudad activa.

### Datos del modelo

| Métrica | Valor |
|---------|-------|
| Algoritmo CF | SVD++ (scikit-surprise) |
| Factores | 25 |
| Épocas | 30 |
| RMSE | 1.28 |
| Ciudades | 10 (Philadelphia, Tucson, Tampa, Indianapolis, Nashville, New Orleans, Reno, Edmonton, Saint Louis, Santa Barbara) |
| Usuarios en trainset | 1 740 000+ |
| Negocios | 150 000+ |
| Usuarios demo con SVD++ pre-computado | 7 (camila, daniel, sara, alex, maria, carlos, sofia) |
| Reviews pre-procesadas | ~1 000 000 (top-10 por negocio por votos útiles) |

---

## Generar artefactos (requiere dataset Yelp + modelo SVD++)

Coloca los archivos en:

```
backend/data/yelp_dataset/
  yelp_academic_dataset_business.json
  yelp_academic_dataset_review.json

backend/data/models/
  model_SVDpp_100.joblib
```

Luego (en orden):

```bash
cd backend

# 1. Parquets principales (~5-10 min)
python generate_parquets.py
# → data/top_n.parquet, explanations.parquet, business_meta.parquet,
#    content_model.joblib, eval.json

# 2. Reviews (~2-4 min, requiere business_meta.parquet)
python generate_reviews.py
# → data/reviews_sample.parquet
```

Reinicia el backend después de regenerar.

---

## API

Documentación interactiva: **http://localhost:8000/docs**

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/health` | — | Versión del modelo y timestamp |
| `POST` | `/auth/register` | — | Registro de usuario |
| `POST` | `/auth/login` | — | Login → JWT token |
| `GET` | `/businesses` | opcional | Lista paginada (`city`, `limit`, `offset`) |
| `POST` | `/businesses` | requerida | Crear negocio |
| `GET` | `/businesses/{id}` | opcional | Negocio individual con reviews reales |
| `GET` | `/categories` | — | Top-20 categorías desde datos reales |
| `GET` | `/cities` | — | Lista de ciudades disponibles |
| `GET` | `/search` | — | Búsqueda filtrada (`q`, `category`, `price`) |
| `GET` | `/recommendations` | opcional | Top-N desde parquet |
| `GET` | `/recommendations/cold-start` | — | Content model (`categories`, `price`, `stars`, `city`) |
| `GET` | `/explanations/{id}` | opcional | Breakdown cf/ctx/pop por par usuario-negocio |
| `POST` | `/reviews` | requerida | Calificar negocio (1–5 estrellas) — activa folding-in |
| `GET` | `/reviews/me` | requerida | Reviews del usuario autenticado |
| `GET` | `/users/me` | requerida | Perfil del usuario |
| `POST` | `/users/me/taste` | requerida | Actualizar perfil de gusto |
| `POST` | `/users/me/coldstart` | requerida | Guardar perfil del wizard |
| `GET` | `/users/me/coldstart` | requerida | Leer perfil del wizard |

---

## Estructura

```
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Discovery.tsx       picks del día + wizard cold-start
│   │   │   ├── Search.tsx          búsqueda real con filtros
│   │   │   ├── Detail.tsx          detalle + rating (folding-in) + reviews reales
│   │   │   ├── Profile.tsx
│   │   │   └── Login.tsx / Register.tsx
│   │   ├── components/
│   │   │   ├── ColdStartWizard.tsx wizard de 4 pasos (categorías reales del dataset)
│   │   │   ├── ExplanationCard.tsx breakdown cf/ctx/pop
│   │   │   └── cards/              PickCard · SmallCard · TrendingCard
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      JWT + cold-start profile state
│   │   │   └── NeighborhoodContext.tsx
│   │   ├── hooks/          useApi.ts
│   │   └── lib/            api.ts
│   └── vercel.json
└── backend/
    ├── app/
    │   ├── routers/
    │   │   ├── businesses.py       scoring con folding-in + cold-start
    │   │   ├── reviews.py          POST/GET reviews → activa folding-in
    │   │   ├── recommendations.py  SVD++ pre-computado + cold-start endpoint
    │   │   ├── search.py
    │   │   ├── users.py            perfil + wizard preferences
    │   │   └── auth_router.py
    │   ├── services/
    │   │   ├── recommender.py      folding-in (lstsq) · inject_scores · cold-start
    │   │   ├── business_store.py   carga parquets + reviews en memoria
    │   │   └── contextual_scorer.py TIME_CONTEXT · re-ranking por hora
    │   ├── database.py             SQLite: usuarios · reviews · preferencias
    │   └── models.py
    ├── data/                       (ignorado en git)
    │   ├── models/                 model_SVDpp_100.joblib  ← copiar aquí
    │   ├── yelp_dataset/           dataset crudo Yelp      ← copiar aquí
    │   ├── top_n.parquet           scores SVD++ pre-computados
    │   ├── explanations.parquet    breakdown cf/ctx/pop
    │   ├── business_meta.parquet   metadatos + ciudad + tags
    │   ├── reviews_sample.parquet  top-10 reviews/negocio
    │   ├── content_model.joblib    TF-IDF + matriz de features
    │   └── lantern.db              SQLite runtime
    ├── generate_parquets.py        batch: SVD++ vectorizado para todas las ciudades
    ├── generate_reviews.py         batch: extrae top reviews del dataset
    ├── requirements.txt
    └── Dockerfile
```

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
echo "Listo"
EOF
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
