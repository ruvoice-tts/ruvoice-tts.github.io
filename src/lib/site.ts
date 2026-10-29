// Данные сайта на одну сборку: релизы и видимые паки.
import packMeta from '../data/packs.json';
import { loadReleaseData, type AppRelease, type Asset, type PackAsset, type ReleaseData } from './github';

export interface PackMeta {
  id: string; title: string; lang: 'ru' | 'be' | 'uk'; voices: number; minVersion: string;
  license: string; note: string; credits?: string; order: number;
}
export interface VisiblePack extends PackMeta, PackAsset {}

/** Только выложенные паки, по порядку; выложенный без описания — простой карточкой в конце. */
export function visiblePacks(meta: PackMeta[], released: Record<string, PackAsset>): VisiblePack[] {
  return Object.values(released)
    .map(asset => {
      const m = meta.find(p => p.id === asset.id) ??
        { id: asset.id, title: asset.id, lang: 'ru' as const, voices: 0, minVersion: '', license: '', note: '', order: 999 };
      return { ...m, ...asset };
    })
    .sort((a, b) => a.order - b.order);
}

export function downloadOptions(app: AppRelease): Array<{ id: 'full' | 'lite'; asset: Asset }> {
  return [{ id: 'full' as const, asset: app.full }, ...(app.lite ? [{ id: 'lite' as const, asset: app.lite }] : [])];
}

type Site = { release: ReleaseData & { source: 'api' | 'snapshot' }; packs: VisiblePack[] };
let cache: Promise<Site> | undefined;

/** Один запрос к API на всю сборку. */
export function getSite(): Promise<Site> {
  return (cache ??= loadReleaseData().then(release => ({
    release, packs: visiblePacks(packMeta as PackMeta[], release.packs),
  })));
}
