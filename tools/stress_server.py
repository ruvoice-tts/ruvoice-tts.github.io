"""Акцентор и омографы приложения для зонда сайта: JSON по строке через stdin/stdout.
  {"op":"accentor","words":[...]}                               -> {"stress":[[...]], "yo":[[...]]}
  {"op":"homo","ids":[[...]],"starts":[...],"ends":[...],"pad":N} -> {"probs":[...]}
Модели — accentor.ptl и homo.ptl из ассетов приложения; softmax и sigmoid как в SileroModels.kt.
  python tools/stress_server.py --selftest"""
import json, sys

import torch
from torch.jit.mobile import _load_for_lite_interpreter

ASSETS = '/home/kost/serverApp/ruvoice/silero-tts-android/app/src/main/assets/silero/'


_models = {}


def model(name):
    if name not in _models:
        _models[name] = _load_for_lite_interpreter(ASSETS + name)
    return _models[name]


def softmax_rows(t):
    return torch.softmax(t.float(), dim=1).tolist()


def handle(req):
    with torch.no_grad():
        if req['op'] == 'accentor':
            out = model('accentor.ptl')(req['words'])
            parts = out if isinstance(out, (tuple, list)) else (out,)
            stress = softmax_rows(parts[0])
            # акцентор пака может вернуть (logits, None) — тогда «ё» пустые строки той же длины, как accentorOut
            yo = softmax_rows(parts[1]) if len(parts) > 1 and isinstance(parts[1], torch.Tensor) else [[] for _ in stress]
            return {'stress': stress, 'yo': yo}
        if req['op'] == 'homo':
            ids = req['ids']
            flat = torch.full((len(ids), max(len(r) for r in ids)), req['pad'], dtype=torch.long)
            for i, r in enumerate(ids):
                flat[i, :len(r)] = torch.tensor(r, dtype=torch.long)
            logits = model('homo.ptl')(flat, torch.tensor(req['starts'], dtype=torch.long),
                                        torch.tensor(req['ends'], dtype=torch.long))
            return {'probs': torch.sigmoid(logits.float().reshape(-1)).tolist()}
    raise ValueError(f"неизвестная операция: {req['op']}")


def selftest():
    out = handle({'op': 'accentor', 'words': ['замок', 'король', 'читалки']})
    assert len(out['stress']) == 3, out
    for row in out['stress']:
        assert abs(sum(row) - 1) < 1e-4, row
    # маркеры омографа homo_start=83828 и homo_end=83829 вокруг слова, как Stress.kt (cls=2, sep=3, pad=0)
    h = handle({'op': 'homo', 'ids': [[2, 500, 83828, 700, 83829, 3], [2, 83828, 900, 83829, 3]],
                'starts': [2, 1], 'ends': [4, 3], 'pad': 0})
    assert len(h['probs']) == 2 and all(0 < p < 1 for p in h['probs']), h
    print('ok')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
    else:
        for line in sys.stdin:
            print(json.dumps(handle(json.loads(line))), flush=True)
