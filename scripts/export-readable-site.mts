import { spawnSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { unzipSync, zipSync, type Zippable } from 'fflate';
import { parse, type DefaultTreeAdapterMap } from 'parse5';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'apps', 'web', 'out');
const destination = join(root, 'live-site-file.zip');

for (const name of ['@sgo/engine', '@sgo/letters', '@sgo/web']) {
  const result = spawnSync('pnpm', ['--filter', name, 'build'], {
    cwd: root,
    env: { ...process.env, SGO_READABLE_BUILD: '1' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function filesIn(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.isFile()) files.push(path);
    else throw new Error(`Unexpected export entry: ${path}`);
  }
  return files.sort();
}

async function readableHtml(html: string): Promise<string> {
  // Even visually equivalent wrapping changes text nodes that React hydrates.
  // Protect their exact original bytes while formatting tags and inline scripts.
  let prefix = 'READABLE_ORIGINAL_TEXT_';
  while (html.includes(prefix)) prefix += 'X';
  const text: Array<{ start: number; end: number; marker: string; original: string }> = [];
  function visit(node: DefaultTreeAdapterMap['node']): void {
    if ('tagName' in node && ['script', 'style'].includes(node.tagName)) return;
    if (node.nodeName === '#text' && node.sourceCodeLocation) {
      const { startOffset: start, endOffset: end } = node.sourceCodeLocation;
      text.push({ start, end, marker: `${prefix}${text.length}_END`, original: html.slice(start, end) });
    }
    if ('childNodes' in node) node.childNodes.forEach(visit);
    if ('content' in node) visit(node.content);
  }
  visit(parse(html, { sourceCodeLocationInfo: true }));
  let protectedHtml = html;
  for (const item of [...text].sort((a, b) => b.start - a.start)) {
    protectedHtml = protectedHtml.slice(0, item.start) + item.marker + protectedHtml.slice(item.end);
  }
  let result = (await format(protectedHtml, {
    parser: 'html',
    htmlWhitespaceSensitivity: 'strict',
    embeddedLanguageFormatting: 'auto',
    printWidth: 100,
    tabWidth: 2,
    endOfLine: 'lf',
  })).trimEnd();
  for (const item of text) {
    if (result.split(item.marker).length !== 2) throw new Error('HTML formatter lost a text node');
    result = result.replace(item.marker, () => item.original);
  }
  // Refuse an export that changes hydration-sensitive DOM structure or text.
  function structure(node: DefaultTreeAdapterMap['node']): unknown {
    return {
      name: node.nodeName,
      value: 'value' in node ? node.value : 'data' in node ? node.data : undefined,
      attributes: 'attrs' in node ? node.attrs : undefined,
      children: 'tagName' in node && ['script', 'style'].includes(node.tagName)
        ? []
        : 'childNodes' in node ? node.childNodes.map(structure) : [],
      template: 'content' in node ? structure(node.content) : undefined,
    };
  }
  if (JSON.stringify(structure(parse(html))) !== JSON.stringify(structure(parse(result)))) {
    throw new Error('Readable HTML changed the rendered DOM or text');
  }
  return result;
}

const files = await filesIn(out);
const archive: Zippable = {};
let htmlCount = 0;
for (const file of files) {
  // Do not rewrite .txt files: they contain Next's routing protocol, not source.
  if (extname(file) === '.html') {
    await writeFile(file, await readableHtml(await readFile(file, 'utf8')));
    htmlCount += 1;
  } else if (/[/\\]_(?:build|ssg)Manifest\.js$/.test(file)) {
    // Next writes these after webpack. Their parent is the unique build ID,
    // so formatting them cannot reuse a content hash for different file bytes.
    await writeFile(file, await format(await readFile(file, 'utf8'), {
      parser: 'babel', printWidth: 100, tabWidth: 2, endOfLine: 'lf',
    }));
  }
  const name = relative(out, file).split('\\').join('/');
  // Store entries without ZIP compression and use ordinary public file modes.
  archive[name] = [await readFile(file), { level: 0, os: 3, attrs: 0o100644 << 16 }];
}

for (const name of ['index.html', '.htaccess', '404.html', 'robots.txt', 'sitemap.xml']) {
  if (!archive[name]) throw new Error(`Missing required export file: ${name}`);
}

const bytes = zipSync(archive, { level: 0 });
const unpacked = unzipSync(bytes);
for (const file of files) {
  const name = relative(out, file).split('\\').join('/');
  const expected = await readFile(file);
  if (!unpacked[name] || !expected.equals(Buffer.from(unpacked[name]!))) {
    throw new Error(`Archive verification failed: ${name}`);
  }
}
await writeFile(destination, bytes, { mode: 0o644 });
console.log(`Readable static export: ${htmlCount} HTML pages, ${files.length} files.`);
console.log(`Verified ${destination} (${(bytes.length / 1024 / 1024).toFixed(2)} MiB).`);
