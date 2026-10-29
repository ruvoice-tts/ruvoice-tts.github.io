"""Образцы звука для сайта: src/data/phrases.json → зонд конвейера приложения (русский) или акцентор
с системным списком пака (белорусский, украинский) → синтез на модулях паков → public/audio/*.mp3,
src/data/samples.json, src/data/voices.json.
  /home/kost/serverApp/ruvoice/venv-et/bin/python tools/make_samples.py           — сгенерировать всё
  /home/kost/serverApp/ruvoice/venv-et/bin/python tools/make_samples.py --check   — только проверить"""
import json, os, re, shutil, subprocess, sys, tempfile, wave

import numpy as np

TOOLS = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
import synth  # noqa: E402

DATA = os.path.join(SITE, 'src', 'data')
AUDIO = os.path.join(SITE, 'public', 'audio')
APP_DIST = '/home/kost/serverApp/ruvoice/silero-tts-android/dist'
SSTRESS_PY = '/home/kost/serverApp/ruvoice/venv-sstress/bin/python'
SR, HOP, LEAD = 48000, 0.025, 0.25
PACK_ORDER = ['ru_voices', 'ru', 'cis_be', 'cis_uk', 'cis_uk_ext', 'cis_ru']
UNRELEASED = {'cis_uk', 'cis_uk_ext'}  # ещё не в релизе packs — берутся из dist приложения
SILERO = {'aidar', 'baya', 'kseniya', 'eugene', 'xenia'}
MIXES = {'ilya', 'olga'}
TUNER_RU = ['aidar', 'baya', 'kseniya', 'eugene', 'xenia', 'ilya', 'olga', 'solokha', 'grinberg', 'ruslan', 'dmitri']
TUNER_OTHER = {'bel_larisa', 'ukr_kateryna', 'ukr_mykyta'}
NAMES = {'aidar': 'Айдар', 'baya': 'Бая', 'kseniya': 'Ксения', 'xenia': 'Ксения', 'eugene': 'Евгений', 'ilya': 'Илья',
         'olga': 'Ольга', 'bel_larisa': 'Лариса', 'bel_anatoliy': 'Анатолий', 'bel_dmitriy': 'Дмитрий', 'ukr_igor': 'Ігор',
         'ukr_roman': 'Роман', 'ukr_kateryna': 'Катерина', 'ukr_lada': 'Лада', 'ukr_mykyta': 'Микита',
         'ukr_oleksa': 'Олекса', 'ukr_tetiana': 'Тетяна'}

# Ударения для белорусского и украинского: акцентор silero-stress, поверх него системный список пака (stress.txt),
# «+» только у слов, которым его ставит приложение (LangStress: не служебное слово и не меньше двух гласных).
# VOWELS и NO_MARK скопированы из ruvoice-tts/tools/export_pack.py.
LANG_STRESS = r'''
import json, re, sys
from silero_stress import load_accentor
VOWELS = {'be': 'аеёіоуыэюя', 'uk': 'аеєиіїоуюя'}
NO_MARK = {
    'be': {'ў', 'у', 'з', 'с', 'на', 'да', 'па', 'за', 'ад', 'аб', 'для', 'пры', 'між', 'пад', 'над', 'без', 'праз',
           'пра', 'а', 'і', 'не', 'ні', 'бы', 'жа', 'ці', 'то', 'як', 'што', 'хто', 'дзе', 'калі', 'так', 'ну', 'вось',
           'чым', 'каб', 'але', 'або', 'усе', 'усё'},
    'uk': set('у в з із зі зо о об на до по за від од для при між під над без про а і й та не ні б би ж же чи то як що '
              'хто де коли так ну ось щоб але або аби це'.split()),
}
acc, lists, out = {}, {}, {}
for key, (text, lang, list_path) in json.load(sys.stdin).items():
    a = acc.get(lang) or acc.setdefault(lang, load_accentor(lang={'be': 'bel', 'uk': 'ukr'}[lang]))
    if list_path not in lists:
        lists[list_path] = dict(l.split()[:2] for l in open(list_path, encoding='utf-8') if l.strip() and not l.startswith('#'))
    fixes = lists[list_path]
    def fix(m):
        tok = m.group(0); base = tok.replace('+', '')
        if base in fixes: return fixes[base]
        if base in NO_MARK[lang] or sum(c in VOWELS[lang] for c in base) < 2: return base
        return tok
    out[key] = re.sub(r"[+\w]+", fix, a(text.lower()))
print(json.dumps(out, ensure_ascii=False))
'''


def lang_of(vid):
    return 'be' if vid.startswith('bel_') else 'uk' if vid.startswith('ukr_') else 'ru'


def ensure_packs():
    root = synth.PACKS
    os.makedirs(root, exist_ok=True)
    for pid in PACK_ORDER:
        d = os.path.join(root, pid)
        if os.path.exists(os.path.join(d, 'pack.json')):
            continue
        z = os.path.join(APP_DIST if pid in UNRELEASED else root, f'ruvoice-pack-{pid}.zip')
        if pid not in UNRELEASED and not os.path.exists(z):
            subprocess.run(['gh', 'release', 'download', 'packs', '-R', 'kost-t-human/ruvoice-tts',
                            '-p', f'ruvoice-pack-{pid}.zip', '-D', root], check=True)
        subprocess.run(['unzip', '-q', '-o', z, '-d', d], check=True)


def build_voices(packs):
    phrases_ru = ['book', 'dialog', 'numbers', 'sr']
    voices = []
    for pid in PACK_ORDER:
        for vid in packs[pid].speakers:
            lang = lang_of(vid)
            in_tuner = (pid == 'ru_voices' and vid in TUNER_RU) or vid in TUNER_OTHER
            names = phrases_ru if in_tuner and lang == 'ru' else ['book']
            voices.append({
                'key': f'{pid}:{vid}', 'id': vid, 'name': NAMES.get(vid), 'pack': pid, 'lang': lang,
                'source': 'mix' if vid in MIXES else ('open' if pid == 'ru_voices' and vid not in SILERO else 'silero'),
                'base': packs[pid].bases.get(vid) or (vid if vid in SILERO else None),
                'builtIn': pid == 'ru_voices', 'inTuner': in_tuner,
                'samples': {p: f'voice/{pid}/{vid}/{p}' for p in names},
            })
    return voices


def base_class(base):
    """Начало фразы в synthSegment зависит от основы голоса: aidar, kseniya/eugene, остальные."""
    return 'aidar' if base == 'aidar' else 'kseniya' if base in ('kseniya', 'eugene') else 'baya'


def run_probe(inputs):
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = os.path.join(tmp, 'in.json'), os.path.join(tmp, 'out.json')
        json.dump(inputs, open(src, 'w', encoding='utf-8'), ensure_ascii=False)
        subprocess.run(['bash', os.path.join(TOOLS, 'run_probe.sh'), src, dst], check=True)
        return {o['key']: o['segments'] for o in json.load(open(dst, encoding='utf-8'))}


def lang_stress(req):
    out = subprocess.run([SSTRESS_PY, '-c', LANG_STRESS], input=json.dumps(req, ensure_ascii=False),
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def render(pack, segs, speaker, with_words=False):
    """Куски подряд с паузами из зонда; слова — по длительностям символов (пробел разделяет слова)."""
    inv = {i: c for c, i in pack.symbol_to_id.items()}
    parts, words, t = [np.zeros(int(SR * LEAD), np.float32)], [], LEAD
    for seg in segs:
        audio, durs = synth.run(pack, seg, speaker)
        if with_words:
            cur, start = 0.0, None
            for sid, k in zip(seg['seq'], durs):
                ch = inv.get(int(sid), ' ')
                if ch in ' |~':
                    if start is not None:
                        words.append([round(t + start, 3), round(t + cur, 3)]); start = None
                elif start is None:
                    start = cur
                cur += float(k) * 0.0125
            if start is not None:
                words.append([round(t + start, 3), round(t + cur, 3)])
        parts.append(audio); t += len(audio) / SR
        pause = seg.get('pauseAfterMs', 0) / 1000
        if pause:
            parts.append(np.zeros(int(SR * pause), np.float32)); t += pause
    pcm = np.concatenate(parts)
    return pcm / max(1e-9, float(np.abs(pcm).max())) * 0.89, words  # пик −1 дБ


def ffmpeg(pcm, args, suffix):
    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, 'in.wav')
        with wave.open(src, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(pcm, -1, 1) * 32767).astype(np.int16).tobytes())
        dst = os.path.join(tmp, 'out' + suffix)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, *args, dst], check=True)
        return open(dst, 'rb').read()


def tempo(pcm, x):
    chain = {2.5: 'atempo=2.0,atempo=1.25', 3: 'atempo=2.0,atempo=1.5'}[x]
    raw = ffmpeg(pcm, ['-filter:a', chain, '-ac', '1', '-ar', str(SR), '-f', 'wav'], '.wav')
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        f.write(raw); f.flush()
        with wave.open(f.name) as w:
            return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32767


def save(key, pcm, extra=None):
    """MP3 моно 64 кбит/с и запись samples.json: длительность и огибающая громкости по 25 мс для волны нити."""
    rel = f'audio/{key}.mp3'
    path = os.path.join(SITE, 'public', rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(ffmpeg(pcm, ['-ac', '1', '-ar', str(SR), '-b:a', '64k'], '.mp3'))
    hop = int(SR * HOP)
    rms = [float(np.sqrt(np.mean(pcm[i:i + hop] ** 2))) for i in range(0, len(pcm), hop)]
    top = max(rms) or 1.0
    return {'file': rel, 'duration': round(len(pcm) / SR, 3), 'hop': HOP,
            'env': [round(min(1.0, (r / top) ** 0.6), 2) for r in rms], **(extra or {})}


def plain_segs(pack, probe_segs):
    """Пак со своими символами (cis_ru): модельная строка зонда, перекодированная символами пака."""
    return [{**synth.plain_seg(pack, s['model']), 'pauseAfterMs': s['pauseAfterMs']} for s in probe_segs]


def check(samples, voices, phrases):
    problems = []
    for v in voices:
        for key in v['samples'].values():
            if key not in samples:
                problems.append(f'нет образца {key}')
            elif not os.path.exists(os.path.join(SITE, 'public', samples[key]['file'])):
                problems.append(f'нет файла {samples[key]["file"]}')
    want = len(phrases['hero']['text'].split())
    if len(samples.get('hero', {}).get('words', [])) != want:
        problems.append(f'слов в hero {len(samples.get("hero", {}).get("words", []))}, в тексте {want}')
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(AUDIO) for f in fs) / 1e6
    if size > 15:
        problems.append(f'звук весит {size:.1f} МБ, больше 15')
    for p in problems:
        print('!!', p)
    print('ok' if not problems else f'{len(problems)} проблем', f'({len(samples)} образцов, {size:.1f} МБ)')
    return not problems


def main():
    phrases = json.load(open(os.path.join(DATA, 'phrases.json'), encoding='utf-8'))
    if '--check' in sys.argv:
        samples = json.load(open(os.path.join(DATA, 'samples.json'), encoding='utf-8'))
        voices = json.load(open(os.path.join(DATA, 'voices.json'), encoding='utf-8'))
        sys.exit(0 if check(samples, voices, phrases) else 1)

    ensure_packs()
    shutil.rmtree(AUDIO, ignore_errors=True)  # образцы выкинутых фраз не остаются в public/audio
    packs = {pid: synth.load_pack(os.path.join(synth.PACKS, pid)) for pid in PACK_ORDER}
    voices = build_voices(packs)

    # русские тексты — одним запуском зонда; ключ = фраза + класс основы голоса + режим
    def mode_of(p):
        return phrases['voice'][p].get('mode', 'books')
    inputs, seen = [], set()
    def want(key, text, base, mode='books'):
        if key not in seen:
            seen.add(key); inputs.append({'key': key, 'text': text, 'base': base, 'mode': mode})
    for v in voices:
        if v['lang'] == 'ru':
            for p in v['samples']:
                want(f'{p}|{base_class(v["base"])}', phrases['voice'][p]['ru'], base_class(v['base']), mode_of(p))
    want('hero', phrases['hero']['text'], 'aidar')
    for r in phrases['reads']:
        want(f'reads/{r["id"]}', r['raw'], 'aidar')
    want('homograph', phrases['homograph']['text'], 'aidar')
    tb = phrases['talkback']
    want('talkback', '. '.join(tb['lines']) + '.', 'aidar', tb['mode'])
    probe = run_probe(inputs)

    stressed = lang_stress({f'{v["pack"]}:{v["id"]}': [phrases['voice']['book'][v['lang']], v['lang'],
                                                     os.path.join(synth.PACKS, v['pack'], 'stress.txt')]
                            for v in voices if v['lang'] != 'ru'})
    for k in sorted(set(stressed.values())):
        print('ударения:', k)

    samples = {}
    ru = packs['ru_voices']
    for p in [ru, packs['ru']]:  # у русских паков символы те же, что у приложения
        probe_seq = probe['hero'][0]['seq']
        assert synth.encode(p, probe['hero'][0]['model']) == probe_seq, f'символы пака {p.id} не как у приложения'

    hero_pcm, words = render(ru, probe['hero'], 'aidar', with_words=True)
    samples['hero'] = save('hero', hero_pcm, {'words': words})
    for r in phrases['reads']:
        segs = probe[f'reads/{r["id"]}']
        disp = ' '.join(s['display'] for s in segs).strip()
        if r['raw'][:1].isupper():
            disp = disp[:1].upper() + disp[1:]
        samples[f'reads/{r["id"]}'] = save(f'reads/{r["id"]}', render(ru, segs, 'aidar')[0], {'raw': r['raw'], 'display': disp})
    samples['homograph'] = save('homograph', render(ru, probe['homograph'], 'aidar')[0])
    samples['talkback'] = save('talkback', tempo(render(ru, probe['talkback'], 'aidar')[0], tb['tempo']), {'transcript': tb['lines']})

    for v in voices:
        pack = packs[v['pack']]
        for p, key in v['samples'].items():
            if v['lang'] != 'ru':
                segs = [synth.plain_seg(pack, stressed[f'{v["pack"]}:{v["id"]}'])]
            else:
                segs = probe[f'{p}|{base_class(v["base"])}']
                if v['pack'] not in ('ru_voices', 'ru'):
                    segs = plain_segs(pack, segs)
            pcm = render(pack, segs, v['id'])[0]
            if phrases['voice'][p].get('tempo'):
                pcm = tempo(pcm, phrases['voice'][p]['tempo'])
            samples[key] = save(key, pcm)
        print('голос', v['key'], len(v['samples']))

    json.dump(samples, open(os.path.join(DATA, 'samples.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(voices, open(os.path.join(DATA, 'voices.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # авторство записей — из source пака (часть после «голоса: »), как указано в самом паке
    meta = json.load(open(os.path.join(DATA, 'packs.json'), encoding='utf-8'))
    for m in meta:
        src = packs[m['id']].source if m['id'] in packs else ''
        if 'голоса: ' in src:
            m['credits'] = src.split('голоса: ', 1)[1]
    with open(os.path.join(DATA, 'packs.json'), 'w', encoding='utf-8') as f:
        f.write('[\n' + ',\n'.join('  ' + json.dumps(m, ensure_ascii=False) for m in meta) + '\n]\n')
    sys.exit(0 if check(samples, voices, phrases) else 1)


if __name__ == '__main__':
    main()
