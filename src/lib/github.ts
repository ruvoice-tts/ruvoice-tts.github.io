// Релизы приложения и паков из API GitHub; при любой беде — сохранённый снимок.
import snapshot from '../data/snapshot.json';

const REPO = 'kost-t-human/ruvoice-tts';

export interface Asset { url: string; size: number }
export interface AppRelease { version: string; date: string; url: string; full: Asset; lite?: Asset }
export interface PackAsset extends Asset { id: string; updated: string }
export interface ChangelogEntry { version: string; date: string; url: string; body: string }
export interface ReleaseData { app: AppRelease; packs: Record<string, PackAsset>; changelog: ChangelogEntry[] }

interface GhAsset { name: string; size: number; browser_download_url: string; updated_at: string }
interface GhRelease {
  tag_name: string; draft: boolean; prerelease: boolean; published_at: string; html_url: string;
  body: string | null; assets: GhAsset[];
}

const APP_TAG = /^v\d+\.\d+\.\d+$/;

export function mapReleases(releases: unknown[]): ReleaseData {
  const rels = releases as GhRelease[];
  const asset = (r: GhRelease, name: string): Asset | undefined => {
    const a = r.assets.find(x => x.name === name);
    return a && { url: a.browser_download_url, size: a.size };
  };
  const apps = rels
    .filter(r => !r.draft && !r.prerelease && APP_TAG.test(r.tag_name))
    .sort((a, b) => b.published_at.localeCompare(a.published_at));
  // свежий релиз, у которого уже есть полный APK: пока файлы заливаются, сайт показывает прошлую версию
  const latest = apps.find(r => asset(r, `ruvoice-tts-${r.tag_name.slice(1)}.apk`));
  if (!latest) throw new Error('нет релиза приложения');
  const v = latest.tag_name.slice(1);
  const lite = asset(latest, `ruvoice-tts-${v}-lite.apk`);
  const app: AppRelease = {
    version: v, date: latest.published_at, url: latest.html_url,
    full: asset(latest, `ruvoice-tts-${v}.apk`)!, ...(lite ? { lite } : {}),
  };
  const packs: Record<string, PackAsset> = {};
  for (const a of rels.find(r => r.tag_name === 'packs')?.assets ?? []) {
    const m = /^ruvoice-pack-(.+)\.zip$/.exec(a.name);
    if (m) packs[m[1]] = { id: m[1], url: a.browser_download_url, size: a.size, updated: a.updated_at };
  }
  const changelog = apps.map(r => ({ version: r.tag_name.slice(1), date: r.published_at, url: r.html_url, body: r.body ?? '' }));
  return { app, packs, changelog };
}

/** Сырые релизы: 30 последних и отдельно packs — он старше и в первую страницу не попадает. */
export async function fetchReleases(f: typeof fetch = fetch, token?: string): Promise<unknown[]> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const get = async (path: string) => {
    const r = await f(`https://api.github.com/repos/${REPO}${path}`, { headers });
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.json();
  };
  const [list, packs] = await Promise.all([get('/releases?per_page=30'), get('/releases/tags/packs')]);
  return [...(list as unknown[]), packs];
}

export async function loadReleaseData(opts: { fetch?: typeof fetch; token?: string } = {}):
  Promise<ReleaseData & { source: 'api' | 'snapshot' }> {
  try {
    const raw = await fetchReleases(opts.fetch, opts.token ?? process.env.GITHUB_TOKEN);
    return { ...mapReleases(raw), source: 'api' };
  } catch (e) {
    console.warn(`[releases] API GitHub недоступен (${(e as Error).message}), беру src/data/snapshot.json`);
    return { ...mapReleases(snapshot as unknown[]), source: 'snapshot' };
  }
}
