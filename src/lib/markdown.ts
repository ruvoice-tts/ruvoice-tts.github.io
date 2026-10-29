// Ноты релизов из GitHub (markdown) в HTML; заголовки внутри нот опускаются на два уровня, под h2 страницы.
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

let processor: Awaited<ReturnType<typeof createMarkdownProcessor>> | undefined;

export async function renderMarkdown(md: string): Promise<string> {
  processor ??= await createMarkdownProcessor();
  const { code } = await processor.render(md);
  return code.replace(/<(\/?)h([1-4])\b/g, (_, slash: string, n: string) => `<${slash}h${Number(n) + 2}`);
}
