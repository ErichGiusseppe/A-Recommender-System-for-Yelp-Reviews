"""
Quick script: find top-13 warm Philly reviewers, look up their names,
skip the 3 already used as demo accounts, return 10 test users.
Run from backend/: notebook_env/Scripts/python find_test_users.py
"""
import json, sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = Path('data')
REAL_DIR = DATA_DIR / 'yelp_dataset'

ALREADY_USED = {
    '_BcWyKQL16ndpBdggh2kNA',  # camila
    'ET8n-r7glWYqZhuR6GcdNw',  # daniel
    'bJ5FtCtZX3ZZacz2_2PJjA',  # sara
}

MIN_USER_REVIEWS, MIN_BIZ_REVIEWS = 5, 10

# 1. Load Philly business IDs
print('Loading businesses...', flush=True)
philly_ids = set()
with open(REAL_DIR / 'yelp_academic_dataset_business.json', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if 'hiladelphia' in r.get('city', ''):
            philly_ids.add(r['business_id'])
print(f'  {len(philly_ids):,} Philly businesses', flush=True)

# 2. Count reviews per user (Philly only)
print('Scanning reviews...', flush=True)
user_counts: dict[str, int] = {}
biz_counts:  dict[str, int] = {}
with open(REAL_DIR / 'yelp_academic_dataset_review.json', encoding='utf-8') as f:
    for line in f:
        r = json.loads(line)
        if r['business_id'] not in philly_ids:
            continue
        user_counts[r['user_id']] = user_counts.get(r['user_id'], 0) + 1
        biz_counts[r['business_id']] = biz_counts.get(r['business_id'], 0) + 1
print(f'  {len(user_counts):,} unique users', flush=True)

warm_biz = {b for b, c in biz_counts.items() if c >= MIN_BIZ_REVIEWS}
warm_users = sorted(
    [u for u, c in user_counts.items() if c >= MIN_USER_REVIEWS],
    key=lambda u: -user_counts[u]
)

# 3. Pick top-13, skip already-used
candidates = [u for u in warm_users if u not in ALREADY_USED][:10]
print(f'  candidates: {len(candidates)}', flush=True)

# 4. Look up names from user JSON (stop early when all found)
print('Looking up user names...', flush=True)
needed = set(candidates)
names: dict[str, str] = {}
with open(REAL_DIR / 'yelp_academic_dataset_user.json', encoding='utf-8') as f:
    for line in f:
        if not needed:
            break
        try:
            u = json.loads(line)
            if u['user_id'] in needed:
                names[u['user_id']] = u.get('name', 'Unknown')
                needed.discard(u['user_id'])
        except Exception:
            continue
print(f'  found names: {len(names)}/{len(candidates)}', flush=True)

# 5. Print result
ALIASES = ['alex','maria','carlos','sofia','diego','lucas','ana','pedro','luna','marcos']
print('\n=== TEST USERS ===')
result = {}
for i, uid in enumerate(candidates):
    alias = ALIASES[i] if i < len(ALIASES) else f'user{i+1}'
    name  = names.get(uid, 'Unknown')
    n_reviews = user_counts[uid]
    print(f'{alias:8s}  uid={uid}  name="{name}"  reviews={n_reviews}')
    result[alias] = {
        'user_id':  uid,
        'name':     name,
        'password': alias,
        'avatar':   (alias[0].upper() + alias[1].upper()) if len(alias) >= 2 else 'XX',
        'is_demo':  True,
    }

# 6. Save to a temp file so generate_parquets.py can read it
import json as _json
(DATA_DIR / 'test_users_candidates.json').write_text(
    _json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8'
)
print('\nSaved to data/test_users_candidates.json')
