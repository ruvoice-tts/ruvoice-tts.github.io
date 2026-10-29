// Данные релиза, по которым собран сайт: проверки сборки сверяют с ними ссылки и размеры.
import type { APIRoute } from 'astro';
import { getSite } from '../lib/site';

export const GET: APIRoute = async () => new Response(JSON.stringify((await getSite()).release));
