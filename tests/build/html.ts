// Помощники проверок собранного сайта: читают dist/ после `npm run build`.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, type HTMLElement } from 'node-html-parser';

const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));

const routeFile = (route: string) =>
  route.endsWith('.html') ? join(DIST, route) : join(DIST, route, 'index.html');

export const raw = (route: string): string => readFileSync(routeFile(route), 'utf8');
export const rawFile = (relPath: string): string => readFileSync(join(DIST, relPath), 'utf8');
export const page = (route: string): HTMLElement => parse(raw(route));

export function distFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(DIST, p));
    }
  };
  walk(join(DIST, dir));
  return out;
}
