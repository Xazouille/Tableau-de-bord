# Choisit, pour chaque Pokémon (1 à 493), une carte récente et si possible full art.
import json, glob, re, sys
sets = {s['id']: s['releaseDate'].replace('/', '-') for s in json.load(open('tcg/sets.json'))}
TIER = {'Special Illustration Rare': 3, 'Illustration Rare': 3, 'Trainer Gallery Rare Holo': 2, 'Ultra Rare': 2, 'Rare Ultra': 2,
        'Shiny Ultra Rare': 2, 'Mega Hyper Rare': 2, 'Hyper Rare': 1.5, 'Rare Rainbow': 1.5, 'Rare Secret': 1.5}
SKIP_SETS = {'me55c'}            # rééditions de cartes anciennes
cands = {}
for f in glob.glob('tcg/*.json'):
    sid = f.split('/')[-1][:-5]
    if sid in ('sets', 'tcg-map') or sid in SKIP_SETS or sid not in sets: continue
    for c in json.load(open(f)):
        nums = c.get('nationalPokedexNumbers') or []
        if len(nums) != 1 or c.get('supertype') != 'Pokémon' or not c.get('images'): continue
        cands.setdefault(nums[0], []).append((c, sets[sid]))
def enc(u):
    m = re.match(r'https://images\.pokemontcg\.io/(.+)', u)
    if m: return '1:' + m.group(1)
    m = re.match(r'https://images\.scrydex\.com/pokemon/(.+)', u)
    return '2:' + m.group(1) if m else u
out, stats = [''], {'fullart': 0, 'recent': 0, 'none': 0}
for n in range(1, 494):
    cs = cands.get(n, [])
    if not cs: out.append(''); stats['none'] += 1; continue
    fa = [(TIER[c.get('rarity')], d, c) for c, d in cs if TIER.get(c.get('rarity')) and d >= '2020']
    if fa:
        best = max(fa, key=lambda x: (x[0], x[1]))[2]; stats['fullart'] += 1
    else:
        best = max(cs, key=lambda x: (x[1][:4], 1 if 'Holo' in (x[0].get('rarity') or '') or 'Rare' in (x[0].get('rarity') or '') else 0, x[1]))[0]; stats['recent'] += 1
    out.append(enc(best['images']['small']))
# Choix faits à la main par Aaron (gardés si on relance le script)
for n, c in {390: '1:swsh9/24.png', 391: '1:bw8/16.png', 392: '1:sv6/173.png'}.items(): out[n] = c
print(stats, file=sys.stderr)
print(json.dumps(out))
