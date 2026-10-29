// Подбор сборки: три вопроса по одному, в конце — кнопки скачивания и фокус на результате.
import { formatMB } from '../lib/format';
import { recommend, type Lang } from '../lib/wizard';

interface Item { url: string; size: number }
interface WizardData {
  version: string; full: Item; lite?: Item; rustore: string;
  packs: Array<Item & { id: string; lang: Lang; title: string }>;
}

export function initWizard(): void {
  const form = document.getElementById('wizard-form') as HTMLFormElement | null;
  const dataEl = document.getElementById('wizard-data');
  if (!form || !dataEl) return;
  const data: WizardData = JSON.parse(dataEl.textContent!);
  const steps = [...form.querySelectorAll<HTMLFieldSetElement>('fieldset')];
  const result = document.getElementById('wizard-result')!;
  const title = document.getElementById('wizard-result-title')!;
  const list = document.getElementById('wizard-result-list')!;
  const note = document.getElementById('wizard-result-note')!;
  let at = 0;

  const show = (i: number, focus = true) => {
    at = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    form.querySelector<HTMLButtonElement>('#wizard-back')!.hidden = i === 0;
    form.querySelector<HTMLButtonElement>('#wizard-next')!.hidden = i === steps.length - 1;
    form.querySelector<HTMLButtonElement>('#wizard-go')!.hidden = i !== steps.length - 1;
    if (focus) (steps[i].querySelector<HTMLInputElement>('input:checked') ?? steps[i].querySelector('input'))?.focus();
  };
  const link = (href: string, text: string, label: string) => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = href; a.className = 'play-pill result-link'; a.textContent = text; a.setAttribute('aria-label', label);
    li.append(a);
    return li;
  };

  form.hidden = false;
  show(0, false);
  form.querySelector('#wizard-next')!.addEventListener('click', () => show(Math.min(at + 1, steps.length - 1)));
  form.querySelector('#wizard-back')!.addEventListener('click', () => show(Math.max(at - 1, 0)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    const r = recommend({
      source: fd.get('source') === 'rustore' ? 'rustore' : 'file',
      langs: fd.getAll('langs') as Lang[],
      smallUpdates: fd.get('updates') === 'small',
    }, data.packs, { full: data.full.size, lite: data.lite?.size });
    const name = { full: 'Полная сборка', lite: 'Лёгкая сборка', rustore: 'RuStore' }[r.build];
    title.textContent = `Вам подойдёт: ${name}`;
    list.replaceChildren();
    if (r.build === 'rustore') list.append(link(data.rustore, 'Открыть в RuStore', 'Открыть RuVoice в RuStore'));
    else {
      const it = r.build === 'full' ? data.full : data.lite!;
      list.append(link(it.url, `${name} · ${formatMB(it.size)}`, `Скачать: ${name}, версия ${data.version}, APK, ${formatMB(it.size)}`));
    }
    for (const id of r.packs) {
      const p = data.packs.find(x => x.id === id)!;
      list.append(link(p.url, `Пак «${p.title}» · ${formatMB(p.size)}`, `Скачать пак «${p.title}», ZIP, ${formatMB(p.size)}`));
    }
    note.textContent = r.note;
    result.hidden = false;
    title.focus();
  });
}
