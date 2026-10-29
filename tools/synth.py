"""Синтез на модулях пака так же, как SileroModels.synthesize в приложении:
tts_mel.ptl (мел и длительности) → backbone.pte (ExecuTorch) → head.ptl (звук).
  python tools/synth.py --selftest   — пак ru против исходного пакета v5_5_ru, SNR ≥ 30 дБ"""
import json, os, sys
from dataclasses import dataclass

import numpy as np
import torch

PACKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache', 'packs')
V55 = '/home/kost/serverApp/ruvoice/silero-tts-android/tools/v5_5_ru.pt'


@dataclass
class Pack:
    id: str
    speakers: dict
    bases: dict
    types: bool
    symbol_to_id: dict
    sos: str
    eos: str
    source: str
    mel: object
    backbone: object
    head: object


def load_pack(path: str) -> Pack:
    from executorch.runtime import Runtime
    from torch.jit.mobile import _load_for_lite_interpreter
    meta = json.load(open(os.path.join(path, 'pack.json'), encoding='utf-8'))
    program = Runtime.get().load_program(os.path.join(path, 'backbone.pte'))
    return Pack(
        id=meta['id'], speakers=meta['speakers'], bases=meta.get('bases') or {}, types=bool(meta.get('types')),
        symbol_to_id=meta['symbol_to_id'], sos=meta['sos'], eos=meta['eos'], source=meta.get('source', ''),
        mel=_load_for_lite_interpreter(os.path.join(path, 'tts_mel.ptl')),
        backbone=program.load_method('forward'),
        head=_load_for_lite_interpreter(os.path.join(path, 'head.ptl')))


def encode(pack: Pack, text: str) -> list:
    """Как Symbols.sequence: sos, известные символы по порядку, eos."""
    ids = [pack.symbol_to_id[pack.sos]]
    ids += [pack.symbol_to_id[c] for c in text if c in pack.symbol_to_id]
    return ids + [pack.symbol_to_id[pack.eos]]


def run(pack: Pack, seg: dict, speaker: str, sr: int = 48000):
    """Звук float32 и длительности символов в кадрах по 12,5 мс; аргументы — как SileroModels.synthesize."""
    seq = torch.tensor([seg['seq']], dtype=torch.long)
    durs_in = {int(k): int(v) for k, v in seg['symbDurs'].items()} or None
    args = [seq, torch.tensor([pack.speakers[speaker]], dtype=torch.long), sr, durs_in,
            torch.tensor([seg['rates']], dtype=torch.float32), torch.tensor([seg['pitches']], dtype=torch.float32),
            None, None, 'cpu', -1, False]
    if pack.types:  # type_ids и focus_mask есть только у моделей с types (v5_5_ru)
        focus = torch.tensor([seg['focus']], dtype=torch.long) if any(seg['focus']) else None
        args += [torch.tensor([seg['typeIds']], dtype=torch.long), focus]
    with torch.no_grad():
        mel, durs = pack.mel(*args)
        hid = pack.backbone.execute([mel.contiguous()])[0]
        audio = pack.head(hid, sr, 0.0, True)
    return audio.numpy().reshape(-1).astype(np.float32), durs.numpy().reshape(-1)


def plain_seg(pack: Pack, text: str) -> dict:
    """Кусок без конвейера приложения: единичные темп и высота, тип st, без пауз знаков."""
    seq = encode(pack, text)
    n = len(seq)
    return {'seq': seq, 'typeIds': [0] * n, 'rates': [1.0] * n, 'pitches': [1.0] * n, 'focus': [0] * n, 'symbDurs': {}}


def selftest():
    pack = load_pack(os.path.join(PACKS, 'ru'))
    text = 'прив+ет, м+ир.'
    pk = torch.package.PackageImporter(V55).load_pickle('tts_models', 'model').packages[0]
    ref_seq, _ = pk.preprocess_tacotron(text)
    assert encode(pack, text) == ref_seq.tolist(), (encode(pack, text), ref_seq.tolist())
    audio, durs = run(pack, plain_seg(pack, text), 'aidar')
    seq = ref_seq.unsqueeze(0); n = seq.shape[1]
    with torch.no_grad():
        ref, _ = pk.models[0](seq, torch.LongTensor([0]), 48000, None, torch.ones(1, n), torch.ones(1, n), None, None,
                              'cpu', -1, False, torch.zeros(1, n, dtype=torch.long), None)
    ref = ref[0].numpy()
    m = min(len(ref), len(audio))
    snr = 10 * np.log10(np.sum(ref[:m] ** 2) / max(1e-12, np.sum((ref[:m] - audio[:m]) ** 2)))
    print(f'SNR {snr:.1f} дБ, {len(audio) / 48000:.2f} с, кадров {int(durs.sum())}')
    assert snr >= 30, snr
    print('ok')


if __name__ == '__main__' and '--selftest' in sys.argv:
    selftest()
