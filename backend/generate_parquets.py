"""
Multi-city parquet generation — ALS (implicit library) on all Yelp cities.
Top-N stored globally per user; city filtering happens at query time in the server.

Run from backend/:  venv/Scripts/python generate_parquets.py
Estimated runtime:  ~20-40 min on 8-core CPU (ALS is highly parallelisable).
"""
import json, ast, re, sys, time, os, warnings
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
import scipy.sparse as sp
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import implicit

os.environ.setdefault('OPENBLAS_NUM_THREADS', '4')
sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings('ignore')

DATA_DIR  = Path('data')
REAL_DIR  = DATA_DIR / 'yelp_dataset'
ARTIFACTS = DATA_DIR

W_CF, W_CTX, W_POP  = 0.60, 0.25, 0.15
TOP_N                = 50
MIN_USER_REVIEWS     = 5
MIN_BIZ_REVIEWS      = 10
ALS_FACTORS          = 50
ALS_ITERATIONS       = 20
ALS_ALPHA            = 40.0   # confidence: c_ui = 1 + alpha * stars

# Philadelphia-specific SVG map
SVG_W, SVG_H, SVG_PAD               = 680, 700, 10
PHILLY_LAT_MIN, PHILLY_LAT_MAX      = 39.87, 40.14
PHILLY_LON_MIN, PHILLY_LON_MAX      = -75.28, -74.96

ZIP_TO_NEIGHBORHOOD: dict[str, str] = {
    # Philadelphia
    '19102':'Center City','19103':'Rittenhouse','19104':'University City',
    '19106':'Old City','19107':'Washington Square','19108':'Center City',
    '19109':'Center City','19110':'Center City','19111':'Fox Chase',
    '19112':'South Philly','19113':'South Philly','19114':'Torresdale',
    '19115':'Northeast Philly','19116':'Northeast Philly','19118':'Chestnut Hill',
    '19119':'Mount Airy','19120':'Olney','19121':'North Philly',
    '19122':'North Philly','19123':'Northern Liberties','19124':'Frankford',
    '19125':'Fishtown','19126':'Oak Lane','19127':'Manayunk',
    '19128':'Roxborough','19129':'East Falls','19130':'Fairmount',
    '19131':'West Philly','19132':'North Philly','19133':'Kensington',
    '19134':'Kensington','19135':'Mayfair','19136':'Holmesburg',
    '19137':'Bridesburg','19138':'Germantown','19139':'West Philly',
    '19140':'Logan','19141':'Germantown','19142':'Southwest Philly',
    '19143':'Southwest Philly','19144':'Germantown','19145':'South Philly',
    '19146':'Point Breeze','19147':'Bella Vista','19148':'South Philly',
    '19149':'Mayfair','19150':'Mount Airy','19151':'Overbrook',
    '19152':'Northeast Philly','19153':'Southwest Philly','19154':'Northeast Philly',
    # Nashville
    '37201':'Downtown','37202':'Downtown','37203':'The Gulch','37204':'Berry Hill',
    '37205':'Belle Meade','37206':'East Nashville','37207':'Inglewood',
    '37208':'Germantown','37209':'Nations','37210':'South Nashville',
    '37211':'Nolensville Pike','37212':'Midtown','37213':'Donelson',
    '37214':'Donelson','37215':'Green Hills','37216':'East Nashville',
    '37217':'Antioch','37218':'Bordeaux','37219':'Downtown','37220':'Oak Hill',
    '37221':'Bellevue','37228':'North Nashville','37232':'Vanderbilt',
    # Tampa
    '33602':'Downtown Tampa','33603':'Tampa Heights','33604':'Seminole Heights',
    '33605':'Ybor City','33606':'Hyde Park','33607':'Westshore',
    '33609':'South Tampa','33610':'East Tampa','33611':'Ballast Point',
    '33612':'University','33613':'Lake Magdalene','33614':'West Tampa',
    '33615':'Town N Country','33616':'MacDill','33617':'Temple Terrace',
    '33618':'Carrollwood','33619':'Brandon','33620':'University',
    '33621':'MacDill','33624':'Carrollwood','33625':'Citrus Park',
    # Indianapolis
    '46201':'Near East Side','46202':'Meridian Hills','46203':'Fountain Square',
    '46204':'Downtown Indy','46205':'Broad Ripple','46206':'Eastside',
    '46208':'Mapleton-Fall Creek','46214':'West Indianapolis','46216':'Lawrence',
    '46217':'Southport','46218':'Irvington','46219':'Eastside',
    '46220':'Broad Ripple','46221':'Decatur','46222':'Westside',
    '46224':'Speedway','46225':'Garfield Park','46226':'Lawrence',
    '46227':'Southport','46228':'Pike','46229':'Eastside',
    '46235':'Cumberland','46236':'Lawrence','46237':'Perry',
    '46240':'North Indianapolis','46250':'Castleton','46254':'Pike',
    # New Orleans
    '70112':'Central Business District','70113':'Warehouse District',
    '70114':'Algiers','70115':'Garden District','70116':'French Quarter',
    '70117':'Bywater','70118':'Uptown','70119':'Mid-City',
    '70120':'Carrollton','70122':'Gentilly','70123':'Old Metairie',
    '70124':'Lakeview','70125':'Broadmoor','70126':'New Orleans East',
    '70127':'New Orleans East','70128':'Pontchartrain Park','70130':'Garden District',
    # Reno
    '89501':'Downtown Reno','89502':'Midtown Reno','89503':'West Reno',
    '89505':'Reno','89506':'North Valleys','89509':'South Reno',
    '89511':'South Reno','89512':'North Reno','89519':'Southwest Reno',
    '89521':'South Meadows',
    # Saint Louis
    '63101':'Downtown','63102':'Laclede\'s Landing','63103':'Midtown',
    '63104':'Soulard','63105':'Clayton','63106':'North St. Louis',
    '63107':'Old North St. Louis','63108':'Central West End','63109':'South Hampton',
    '63110':'Forest Park','63111':'Gravois Park','63112':'Skinker-DeBaliviere',
    '63113':'Vandeventer','63116':'Tower Grove South','63117':'Maplewood',
    '63118':'Carondelet','63119':'Webster Groves','63122':'Kirkwood',
    '63123':'Affton','63125':'Lemay','63126':'Affton',
    '63128':'South County','63129':'South County','63130':'University City',
    '63132':'Olivette','63133':'University City','63135':'Ferguson',
    '63136':'Jennings','63137':'Bellefontaine Neighbors','63138':'Spanish Lake',
    '63139':'Lindenwood Park','63141':'Creve Coeur','63143':'Maplewood',
    '63144':'Brentwood','63146':'Creve Coeur',
}

DEMO_DISPLAY_NAMES = {
    'camila': ('Camila Restrepo', 'CR'),
    'daniel': ('Daniel Park',     'DP'),
    'sara':   ('Sara Gómez',      'SG'),
}

TASTE_PROFILES = {
    'new_visitor':   {'categories': 'Restaurants Food',          'stars_pref': 0.80, 'price_pref': 2, 'pop_pref': 0.50},
    'italian_lover': {'categories': 'Italian Pizza Mediterranean','stars_pref': 0.85, 'price_pref': 3, 'pop_pref': 0.60},
    'coffee_seeker': {'categories': 'Coffee Tea Cafe Bakeries',  'stars_pref': 0.75, 'price_pref': 1, 'pop_pref': 0.40},
    'nightlife':     {'categories': 'Bars Nightlife Cocktail',   'stars_pref': 0.70, 'price_pref': 2, 'pop_pref': 0.70},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_attr(raw):
    if not raw: return {}
    out = {}
    for k, v in raw.items():
        if v is None: continue
        if v in ('True', 'False', 'None'):
            out[k] = {'True': True, 'False': False, 'None': None}[v]
            continue
        if isinstance(v, str):
            m = re.match(r"^u'(.+)'$", v)
            if m: out[k] = m.group(1); continue
            if v.startswith('{'):
                try: out[k] = ast.literal_eval(v); continue
                except: pass
        out[k] = v
    return out

def _to_svg_philly(lat, lon):
    if lat is None or lon is None: return None, None
    x = (lon - PHILLY_LON_MIN) / (PHILLY_LON_MAX - PHILLY_LON_MIN) * SVG_W + SVG_PAD
    y = (PHILLY_LAT_MAX - lat)  / (PHILLY_LAT_MAX - PHILLY_LAT_MIN) * SVG_H + SVG_PAD
    return round(float(x), 1), round(float(y), 1)

def _ctx_score(cat_list, hour=20):
    CAT_HOUR_BOOST = {
        'Breakfast & Brunch': {'morning':1.3,'lunch':1.1},
        'Coffee & Tea':       {'morning':1.4,'afternoon':1.2},
        'Bars':               {'dinner':1.2,'late_night':1.5},
        'Italian':            {'dinner':1.2},
        'Sushi Bars':         {'lunch':1.1,'dinner':1.3},
        'Pizza':              {'lunch':1.1,'dinner':1.2,'late_night':1.3},
    }
    if   6  <= hour < 11: bucket = 'morning'
    elif 11 <= hour < 15: bucket = 'lunch'
    elif 15 <= hour < 18: bucket = 'afternoon'
    elif 18 <= hour < 23: bucket = 'dinner'
    else:                 bucket = 'late_night'
    boost = 1.0
    for c in cat_list:
        if c in CAT_HOUR_BOOST:
            boost = max(boost, CAT_HOUR_BOOST[c].get(bucket, 1.0))
    return min((boost - 1.0) / 0.5, 1.0)


# ── 1. Load ALL businesses (all cities) ──────────────────────────────────────
print('── 1. Loading businesses (all cities)...', flush=True)
t0 = time.time()
biz_rows = []
with open(REAL_DIR / 'yelp_academic_dataset_business.json', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        city = r.get('city', '').strip()
        if not city: continue
        attrs = _parse_attr(r.get('attributes') or {})
        cats  = [c.strip() for c in (r.get('categories') or '').split(',') if c.strip()]
        lat, lon = r.get('latitude'), r.get('longitude')
        is_philly = 'hiladelphia' in city
        sx, sy = _to_svg_philly(lat, lon) if is_philly else (None, None)
        biz_rows.append({
            'business_id':    r['business_id'],
            'name':           r['name'].strip(),
            'city':           city,
            'address':        r.get('address', ''),
            'postal_code':    str(r.get('postal_code', '')).strip(),
            'latitude':       lat,
            'longitude':      lon,
            'svg_x':          sx,
            'svg_y':          sy,
            'stars':          r.get('stars'),
            'review_count':   r.get('review_count', 0),
            'is_open':        int(r.get('is_open', 0)),
            'categories':     r.get('categories', ''),
            'category_list':  cats,
            'price_range':    attrs.get('RestaurantsPriceRange2'),
        })

businesses_df = pd.DataFrame(biz_rows)

def _assign_neighborhood(row):
    z = str(row.get('postal_code', '') or '').strip().split('-')[0][:5]
    if z in ZIP_TO_NEIGHBORHOOD:
        return ZIP_TO_NEIGHBORHOOD[z]
    return str(row['city'])

businesses_df['neighborhood'] = businesses_df.apply(_assign_neighborhood, axis=1)
city_counts = businesses_df['city'].value_counts()
print(f'  {len(businesses_df):,} businesses  |  {len(city_counts)} cities  ({time.time()-t0:.1f}s)', flush=True)
print('  Top cities:', dict(city_counts.head(10)), flush=True)


# ── 2. Load ALL reviews ───────────────────────────────────────────────────────
print('── 2. Loading reviews (all cities)...', flush=True)
t0 = time.time()
all_biz_ids = set(businesses_df['business_id'])
rev_rows = []
with open(REAL_DIR / 'yelp_academic_dataset_review.json', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i % 2_000_000 == 0 and i > 0:
            print(f'     {i//1_000_000}M scanned  {len(rev_rows):,} kept...', flush=True)
        r = json.loads(line)
        if r['business_id'] not in all_biz_ids: continue
        rev_rows.append({
            'user_id':     r['user_id'],
            'business_id': r['business_id'],
            'stars':       float(r['stars']),
            'date':        r['date'][:10],
        })

reviews_df = pd.DataFrame(rev_rows)
reviews_df['date'] = pd.to_datetime(reviews_df['date'])
print(f'  {len(reviews_df):,} reviews  ({time.time()-t0:.1f}s)', flush=True)


# ── 3. Filter warm users / businesses ────────────────────────────────────────
print('── 3. Filtering warm users/businesses...', flush=True)
uc = reviews_df['user_id'].value_counts()
bc = reviews_df['business_id'].value_counts()
warm_user_ids = set(uc[uc >= MIN_USER_REVIEWS].index)
warm_biz_ids  = set(bc[bc >= MIN_BIZ_REVIEWS].index)
reviews_warm  = reviews_df[
    reviews_df['user_id'].isin(warm_user_ids) &
    reviews_df['business_id'].isin(warm_biz_ids)
].copy().reset_index(drop=True)

warm_biz_df = businesses_df[businesses_df['business_id'].isin(warm_biz_ids)].copy().reset_index(drop=True)

print(f'  warm users: {len(warm_user_ids):,}  warm biz: {len(warm_biz_df):,}  reviews: {len(reviews_warm):,}', flush=True)
wc = warm_biz_df['city'].value_counts()
print(f'  Warm businesses by city: {dict(wc.head(10))}', flush=True)


# ── 4. Train ALS model ────────────────────────────────────────────────────────
print('── 4. Training ALS model...', flush=True)
t0 = time.time()

all_users_list = sorted(reviews_warm['user_id'].unique())
all_items_list = sorted(reviews_warm['business_id'].unique())
user2idx = {u: i for i, u in enumerate(all_users_list)}
item2idx = {b: i for i, b in enumerate(all_items_list)}
n_u, n_i = len(all_users_list), len(all_items_list)

# items × users sparse confidence matrix
rows_i = np.array([item2idx[b] for b in reviews_warm['business_id']])
cols_i = np.array([user2idx[u] for u in reviews_warm['user_id']])
conf_v = (1.0 + ALS_ALPHA * reviews_warm['stars'].values).astype(np.float32)
item_user_mat = sp.coo_matrix((conf_v, (rows_i, cols_i)), shape=(n_i, n_u)).tocsr()

als_model = implicit.als.AlternatingLeastSquares(
    factors=ALS_FACTORS,
    iterations=ALS_ITERATIONS,
    regularization=0.1,
    random_state=42,
    use_gpu=False,
)
als_model.fit(item_user_mat)
print(f'  ALS done  users={n_u:,}  items={n_i:,}  ({time.time()-t0:.1f}s)', flush=True)


# ── 5. Select demo / test users ───────────────────────────────────────────────
print('── 5. Selecting demo/test users...', flush=True)
philly_biz_ids = set(businesses_df[businesses_df['city'].str.contains('hiladelphia', na=False)]['business_id'])
philly_rev_counts = (
    reviews_warm[reviews_warm['business_id'].isin(philly_biz_ids)]
    ['user_id'].value_counts()
)
top3 = philly_rev_counts.head(3).index.tolist()

DEMO_MAP = {'camila': top3[0], 'daniel': top3[1], 'sara': top3[2]}
EXTRA_MAP: dict[str, str] = {}
candidates_path = ARTIFACTS / 'test_users_candidates.json'
if candidates_path.exists():
    with open(candidates_path, encoding='utf-8') as f:
        cands = json.load(f)
    for alias, info in cands.items():
        EXTRA_MAP[alias] = info['user_id']

ALL_USERS = {**DEMO_MAP, **EXTRA_MAP}
print(f'  {len(ALL_USERS)} users  ({len(DEMO_MAP)} demo + {len(EXTRA_MAP)} test)')

profiles = {}
for alias, real_id in DEMO_MAP.items():
    display, initials = DEMO_DISPLAY_NAMES[alias]
    profiles[alias] = {'user_id': real_id, 'name': display,
                       'password': alias, 'avatar': initials, 'is_demo': True}
if candidates_path.exists():
    with open(candidates_path, encoding='utf-8') as f:
        for alias, info in json.load(f).items():
            profiles[alias] = info

(ARTIFACTS / 'user_profiles_map.json').write_text(
    json.dumps(profiles, indent=2, ensure_ascii=False), encoding='utf-8')
print('  user_profiles_map.json written', flush=True)


# ── 6. Build item metadata arrays ─────────────────────────────────────────────
print('── 6. Building item metadata arrays...', flush=True)
biz_list = all_items_list                        # businesses known to ALS model
n_biz    = len(biz_list)

# Popularity normalised (log review_count → MinMax)
rc_series = warm_biz_df.set_index('business_id')['review_count'].reindex(biz_list, fill_value=1)
pop_arr   = MinMaxScaler().fit_transform(np.log1p(rc_series.values).reshape(-1, 1)).flatten()

biz_cats  = warm_biz_df.set_index('business_id')['category_list'].to_dict()
ctx_arr   = np.array([_ctx_score(biz_cats.get(bid, [])) for bid in biz_list], dtype=np.float64)

# 80/20 train/test split for seen-item masking
train_df  = reviews_warm.sort_values('date').iloc[:int(len(reviews_warm) * 0.80)]
train_seen = train_df.groupby('user_id')['business_id'].apply(set).to_dict()

# implicit names are swapped relative to our item_user_mat orientation:
# when fit on (n_items × n_users), item_factors rows = users, user_factors rows = items
user_factors = als_model.item_factors   # shape (n_u, factors) — one row per user
item_factors = als_model.user_factors   # shape (n_i, factors) — one row per item
print(f'  user_factors {user_factors.shape}  item_factors {item_factors.shape}', flush=True)


# ── 7. Batch top-N for demo/test users ───────────────────────────────────────
print('── 7. Generating top-N for all users...', flush=True)
t0 = time.time()
top_n_rows, expl_rows = [], []

for alias, real_id in ALL_USERS.items():
    if real_id not in user2idx:
        print(f'  {alias}: not in ALS training data — skipping CF', flush=True)
        continue

    u_idx = user2idx[real_id]
    u_vec = user_factors[u_idx].astype(np.float64)     # (factors,)

    # ALS raw score = item_factors @ u_vec  →  normalise [0,1]
    cf_raw = item_factors.astype(np.float64).dot(u_vec)
    cf_min, cf_max = cf_raw.min(), cf_raw.max()
    cf_arr = (cf_raw - cf_min) / max(cf_max - cf_min, 1e-8)

    hybrid = W_CF * cf_arr + W_CTX * ctx_arr + W_POP * pop_arr

    # Mask seen businesses
    seen = train_seen.get(real_id, set())
    for k, bid in enumerate(biz_list):
        if bid in seen:
            hybrid[k] = -np.inf

    top_idx = np.argpartition(hybrid, -TOP_N)[-TOP_N:]
    top_idx = top_idx[np.argsort(hybrid[top_idx])[::-1]]

    for k in top_idx:
        bid   = biz_list[k]
        score = float(hybrid[k])
        top_n_rows.append({'user_id': real_id, 'business_id': bid, 'score': round(score, 4)})
        expl_rows.append({'user_id': real_id, 'business_id': bid,
                          'cf':  round(float(cf_arr[k]) * 100),
                          'ctx': round(float(ctx_arr[k]) * 100),
                          'pop': round(float(pop_arr[k]) * 100)})

    print(f'  {alias:8s}: top-{TOP_N} done  best={float(hybrid[top_idx[0]]):.4f}', flush=True)

print(f'  all users in {time.time()-t0:.2f}s', flush=True)


# ── 8. Content-based cold-start (global + per top city) ──────────────────────
print('── 8. Building content-based cold-start model...', flush=True)
t0 = time.time()

cb_df   = warm_biz_df[['business_id','categories','stars','review_count','is_open','price_range']].copy()
tfidf   = TfidfVectorizer(analyzer='word', token_pattern=r'[A-Za-z][A-Za-z ]+',
                           min_df=3, max_features=500, sublinear_tf=True)
tfidf_mat = tfidf.fit_transform(cb_df['categories'].fillna(''))

num_feats = cb_df[['stars','review_count','is_open']].copy()
num_feats['review_count'] = np.log1p(num_feats['review_count'])
scaler_cb = MinMaxScaler()
num_mat   = scaler_cb.fit_transform(num_feats)

import math as _math
price_vals = cb_df['price_range'].apply(
    lambda v: min(4, max(1, int(float(v)) if (v is not None and not (isinstance(v, float) and _math.isnan(v)) and v) else 2))
).clip(1, 4)
price_oh   = np.zeros((len(cb_df), 4))
for i, p in enumerate(price_vals):
    price_oh[i, p - 1] = 1.0

feature_mat = sp.hstack([tfidf_mat, sp.csr_matrix(num_mat), sp.csr_matrix(price_oh)])
biz_ids_cb  = cb_df['business_id'].tolist()
# recompute pop aligned to biz_ids_cb (warm_biz_df), not biz_list (ALS subset)
rc_series_cb = warm_biz_df.set_index('business_id')['review_count'].reindex(biz_ids_cb, fill_value=1)
pop_arr_cb   = MinMaxScaler().fit_transform(np.log1p(rc_series_cb.values).reshape(-1, 1)).flatten()
city_by_bid = warm_biz_df.set_index('business_id')['city'].to_dict()
biz_idx_map = {bid: i for i, bid in enumerate(biz_ids_cb)}

def _query_vec(profile):
    tq  = tfidf.transform([profile['categories']])
    nq  = sp.csr_matrix(np.array([[profile.get('stars_pref', 0.8),
                                    profile.get('pop_pref', 0.5), 1.0]]))
    poh = np.zeros((1, 4)); poh[0, min(3, max(0, int(profile.get('price_pref', 2)) - 1))] = 1.0
    return sp.hstack([tq, nq, sp.csr_matrix(poh)])

cold_rows = []
top_cities_for_coldstart = list(warm_biz_df['city'].value_counts().head(12).index)

for pname, profile in TASTE_PROFILES.items():
    sims  = cosine_similarity(_query_vec(profile), feature_mat).flatten()
    final = 0.75 * sims + 0.25 * pop_arr_cb

    # Global cold-start
    top_idx = np.argsort(final)[::-1][:TOP_N]
    for i in top_idx:
        cold_rows.append({
            'user_id': pname, 'business_id': biz_ids_cb[i],
            'score': round(float(final[i]), 4), 'cf': 0,
            'ctx': round(float(sims[i]) * 100), 'pop': round(float(pop_arr_cb[i]) * 100),
        })

    # Per-city cold-start so new_visitor in Tampa gets Tampa restaurants
    for city_name in top_cities_for_coldstart:
        city_mask = np.array([city_by_bid.get(b, '') == city_name for b in biz_ids_cb])
        if city_mask.sum() < 5: continue
        city_scores = final.copy(); city_scores[~city_mask] = -np.inf
        cidx = np.argsort(city_scores)[::-1][:TOP_N]
        cidx = cidx[city_scores[cidx] > 0]
        profile_key = f'{pname}|{city_name}'
        for i in cidx:
            cold_rows.append({
                'user_id': profile_key, 'business_id': biz_ids_cb[i],
                'score': round(float(final[i]), 4), 'cf': 0,
                'ctx': round(float(sims[i]) * 100), 'pop': round(float(pop_arr_cb[i]) * 100),
            })

print(f'  cold-start rows: {len(cold_rows):,}  ({time.time()-t0:.1f}s)', flush=True)


# ── 9. Save artifacts ─────────────────────────────────────────────────────────
print('── 9. Saving artifacts...', flush=True)

top_n_df  = pd.DataFrame(top_n_rows)
expl_df   = pd.DataFrame(expl_rows)
cold_df   = pd.DataFrame(cold_rows)

top_all  = pd.concat([top_n_df, cold_df[['user_id','business_id','score']]], ignore_index=True)
expl_all = pd.concat([expl_df,  cold_df[['user_id','business_id','cf','ctx','pop']]], ignore_index=True)

top_all.to_parquet(ARTIFACTS / 'top_n.parquet',         index=False)
expl_all.to_parquet(ARTIFACTS / 'explanations.parquet', index=False)

meta_cols = ['business_id','name','city','neighborhood','svg_x','svg_y',
             'latitude','longitude','stars','review_count','price_range',
             'categories','is_open','address','postal_code']
warm_biz_df[meta_cols].to_parquet(ARTIFACTS / 'business_meta.parquet', index=False)

joblib.dump(
    {'tfidf': tfidf, 'feature_mat': feature_mat, 'biz_ids': biz_ids_cb, 'scaler': scaler_cb},
    ARTIFACTS / 'content_model.joblib',
)

eval_data = {
    'model_version': f'als-hybrid-{ALS_FACTORS}f-{ALS_ITERATIONS}it',
    'n_users': int(n_u), 'n_items': int(n_i),
    'n_train': int(len(train_df)),
    'n_test':  int(len(reviews_warm) - len(train_df)),
    'cities':  {k: int(v) for k, v in wc.head(15).items()},
}
(ARTIFACTS / 'eval.json').write_text(json.dumps(eval_data, indent=2))
(ARTIFACTS / 'ctx_weights.json').write_text(json.dumps({'cf': W_CF, 'ctx': W_CTX, 'pop': W_POP}, indent=2))
(ARTIFACTS / 'taste_profiles.json').write_text(json.dumps(TASTE_PROFILES, indent=2))

print('\nArtifacts:')
for p in ['top_n.parquet','explanations.parquet','business_meta.parquet',
          'content_model.joblib','user_profiles_map.json','eval.json']:
    f = ARTIFACTS / p
    mb = f.stat().st_size / 1024**2 if f.exists() else 0
    print(f'  {p:<40} {mb:.1f} MB')

print(f'\nDONE  —  {len(top_all):,} top-N rows  |  {len(expl_all):,} explanation rows')
