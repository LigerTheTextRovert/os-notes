import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { createHighlighter, createCssVariablesTheme } from 'shiki';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOTES_SRC = path.join(ROOT, 'src', 'notes');
const NOTE_TEMPLATE = path.join(ROOT, 'src', 'templates', 'note.html');
const INDEX_TEMPLATE = path.join(ROOT, 'src', 'templates', 'index.html');
const CHAPTERS_DIR = path.join(ROOT, 'chapters');
const INDEX_OUT = path.join(ROOT, 'index.html');

const CHAPTER_META = {
  1: {
    title: 'فصل ۱ — آشنایی با سخت‌افزار و سیستم‌عامل',
    code: 'OS01',
  },
  2: {
    title: 'فصل ۲ — حفاظت، امنیت و ساختار سیستم',
    code: 'OS02',
  },
  3: {
    title: 'فصل ۳ — مدیریت پروسس‌ها و ارتباط بین آن‌ها',
    code: 'OS03',
  },
};

const CHAPTER_TITLES = {
  1: 'فصل ۱ — آشنایی با سخت‌افزار و سیستم‌عامل',
  2: 'فصل ۲ — حفاظت، امنیت و ساختار سیستم',
  3: 'فصل ۳ — مدیریت پروسس‌ها و ارتباط بین آن‌ها',
};

const MODE_LABEL = {
  translate: 'ترجمه',
  summary: 'خلاصه',
  intro: 'پیش‌درآمد',
  glossary: 'واژه‌نامه',
};

const faDigits = (value) =>
  String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[digit]);

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

const SHIKI_THEME = 'portfolio';
const SHIKI_LANGS = [
  'sql',
  'javascript',
  'typescript',
  'bash',
  'shell',
  'json',
  'c',
  'cpp',
  'asm',
];

let highlighterPromise;

function getHighlighter() {
  if (!highlighterPromise) {
    const theme = createCssVariablesTheme({
      name: SHIKI_THEME,
      variablePrefix: '--shiki-',
      fontStyle: true,
    });
    highlighterPromise = createHighlighter({ themes: [theme], langs: SHIKI_LANGS });
  }
  return highlighterPromise;
}

let markedReady = false;
let currentHeadings = [];
let currentHeadingIds = new Set();

function slugifyHeading(clean, idSet) {
  let base = clean
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '') || 'section';
  let slug = `toc-${base}`;
  let uniqueSlug = slug;
  let counter = 1;
  while (idSet.has(uniqueSlug)) {
    uniqueSlug = `${slug}-${counter++}`;
  }
  idSet.add(uniqueSlug);
  return uniqueSlug;
}

async function ensureMarked() {
  if (markedReady) return;
  const highlighter = await getHighlighter();
  const loaded = new Set(highlighter.getLoadedLanguages());
  marked.use({
    gfm: true,
    breaks: false,
    renderer: {
      code({ text, lang }) {
        const requested = (lang ?? '').trim().split(/\s+/)[0];
        const language = requested && loaded.has(requested) ? requested : 'text';
        return highlighter.codeToHtml(text, { lang: language, theme: SHIKI_THEME });
      },
      heading(arg) {
        const depth = arg.depth;
        const content = this.parser.parseInline(arg.tokens);
        const cleanTitle = arg.text.replace(/[`*_~]/g, '').replace(/<[^>]+>/g, '').trim();

        if (depth === 2 || depth === 3 || depth === 4) {
          const id = slugifyHeading(cleanTitle, currentHeadingIds);
          if (depth === 2 || depth === 3) {
            currentHeadings.push({ depth, id, title: cleanTitle });
          }
          return `<h${depth} id="${id}">${content}</h${depth}>\n`;
        }
        return `<h${depth}>${content}</h${depth}>\n`;
      },
    },
  });
  markedReady = true;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function parseFile(name) {
  const match = name.match(/^(?<slug>.+?)\.(?<lang>[a-z]{2})\.md$/);
  if (match) {
    return { slug: match.groups.slug, lang: match.groups.lang };
  }
  if (name.endsWith('.md')) {
    return { slug: name.slice(0, -3), lang: 'fa' };
  }
  return null;
}

function urlPath(slug) {
  return `/chapters/${slug}.html`;
}

function outputPath(slug) {
  return path.join(CHAPTERS_DIR, `${slug}.html`);
}

function readingMinutes(content = '') {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatter = new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return formatter.format(date);
}

function isoDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toISOString().slice(0, 10);
}

async function loadNotes() {
  if (!existsSync(NOTES_SRC)) return [];
  const entries = await readdir(NOTES_SRC, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name);

  const notes = [];

  for (const file of files) {
    const parsed = parseFile(file);
    if (!parsed) continue;

    const full = path.join(NOTES_SRC, file);
    const raw = await readFile(full, 'utf8');
    const { data, content } = matter(raw);

    notes.push({
      slug: parsed.slug,
      lang: parsed.lang,
      title: data.title ?? parsed.slug,
      summary: data.summary ?? '',
      body: content,
      date: data.date ?? new Date().toISOString(),
      minutes: readingMinutes(content),
      chapter: data.chapter != null ? Number(data.chapter) : 1,
      section: data.section != null ? String(data.section) : '1',
      order: data.order != null ? Number(data.order) : 1,
      mode: data.mode ? String(data.mode) : 'summary',
      book: data.book ? String(data.book) : '',
      edition: data.edition ? String(data.edition) : '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      draft: data.draft === true,
    });
  }

  return notes.sort(byOrder);
}

function renderMarkdown(source = '') {
  currentHeadings = [];
  currentHeadingIds = new Set();
  const figures = [];
  const placeholder = (i) => `<!--RAW_FIGURE_BLOCK_${i}-->`;
  const protectedMd = source.replace(/<figure[\s\S]*?<\/figure>/gi, (match) => {
    figures.push(match);
    return placeholder(figures.length - 1);
  });
  let html = marked.parse(protectedMd);
  figures.forEach((fig, i) => {
    html = html.replace(placeholder(i), fig);
  });
  return { html, headings: [...currentHeadings] };
}

function renderToc(headings = []) {
  if (!headings.length) return '';
  const items = headings
    .filter((h) => h.depth === 2 || h.depth === 3)
    .map((h) => {
      const cls = h.depth === 2 ? 'note-toc__item note-toc__item--h2' : 'note-toc__item note-toc__item--h3';
      return `<li class="${cls}"><a href="#${h.id}" class="note-toc__link" data-toc-target="${h.id}">${escapeHtml(h.title)}</a></li>`;
    })
    .join('\n');

  return `<nav class="note-toc" aria-label="فهرست محتوای فصل">
  <p class="label note-toc__head">در این فصل</p>
  <ul class="note-toc__list">
${items}
  </ul>
</nav>`;
}

function renderMobileToc(headings = []) {
  if (!headings.length) return '';
  const items = headings
    .filter((h) => h.depth === 2 || h.depth === 3)
    .map((h) => {
      const cls = h.depth === 2 ? 'mobile-toc__item mobile-toc__item--h2' : 'mobile-toc__item mobile-toc__item--h3';
      return `<li class="${cls}"><a href="#${h.id}" class="mobile-toc__link">${escapeHtml(h.title)}</a></li>`;
    })
    .join('\n');

  return `<details class="mobile-toc" aria-label="فهرست محتوای فصل">
  <summary class="mobile-toc__summary">
    <span class="mobile-toc__summary-text">فهرست مطالب این فصل</span>
    <span class="mobile-toc__badge">${faDigits(headings.filter((h) => h.depth === 2 || h.depth === 3).length)} بخش</span>
  </summary>
  <div class="mobile-toc__content">
    <ul class="mobile-toc__list">
${items}
    </ul>
  </div>
</details>`;
}

function renderModeBadge(note) {
  if (!note.mode) return '';
  return `<span class="note__mode">${escapeHtml(MODE_LABEL[note.mode] ?? note.mode)}</span>`;
}

function renderTags(tags = []) {
  if (!tags.length) return '';
  const items = tags
    .map((tag) => `<li class="tag">#${escapeHtml(tag)}</li>`)
    .join('');
  return `<ul class="tags tags--note" aria-label="موضوعات">${items}</ul>`;
}

function renderSource(note) {
  if (!note.book) return '';
  const parts = [note.book];
  if (note.edition) parts.push(`ویرایش ${note.edition}`);
  if (note.section) parts.push(`بخش ${note.section}`);
  return `<p class="note__source">بر اساس ${escapeHtml(parts.join('، '))} — یادداشت‌های جامع و تحلیل فنی برای درک عمیق.</p>`;
}

function renderSeriesNav(note, allNotes = []) {
  if (allNotes.length === 0) return '';
  const index = allNotes.findIndex((item) => item.slug === note.slug);
  if (index === -1) return '';

  const prev = allNotes[index - 1];
  const next = allNotes[index + 1];
  const label = (item) => escapeHtml(item.title);

  const prevHtml = prev
    ? `<a class="series-nav__link series-nav__link--prev" href="${urlPath(prev.slug)}"><span class="series-nav__label">قبلی</span><span class="series-nav__title">${label(prev)}</span></a>`
    : '<span class="series-nav__spacer" aria-hidden="true"></span>';
  const nextHtml = next
    ? `<a class="series-nav__link series-nav__link--next" href="${urlPath(next.slug)}"><span class="series-nav__label">بعدی</span><span class="series-nav__title">${label(next)}</span></a>`
    : '<span class="series-nav__spacer" aria-hidden="true"></span>';

  return `<nav class="series-nav" aria-label="فصل‌ها">${prevHtml}<a class="series-nav__index" href="/">فهرست</a>${nextHtml}</nav>`;
}

function renderChapterEntry(note, index = 1, includeDrafts = false) {
  const number = faDigits(String(note.topic ?? index).padStart(2, '0'));
  const title = escapeHtml(note.title);
  const summary = escapeHtml(note.summary);

  if (note.draft && !includeDrafts) {
    return `<div class="toc-item toc-item--soon" role="listitem">
              <span class="toc-item__num" aria-hidden="true">${number}</span>
              <div class="toc-item__body">
                <span class="toc-item__title">${title}</span>
                <span class="toc-item__desc">${summary}</span>
              </div>
              <span class="toc-item__action toc-item__action--soon">به‌زودی</span>
            </div>`;
  }

  return `<a class="toc-item" href="${urlPath(note.slug)}" role="listitem">
              <span class="toc-item__num" aria-hidden="true">${number}</span>
              <div class="toc-item__body">
                <span class="toc-item__title">${title}</span>
                <span class="toc-item__desc">${summary}</span>
              </div>
              <span class="toc-item__action">
                <span class="toc-item__action-text">مشاهده خلاصه</span>
                <span class="toc-item__arrow" aria-hidden="true">←</span>
              </span>
            </a>`;
}

function renderIndex(notes, template, includeDrafts = false) {
  const chapters = new Map();
  for (const note of notes) {
    const chapter = note.chapter ?? 1;
    if (!chapters.has(chapter)) chapters.set(chapter, []);
    chapters.get(chapter).push(note);
  }

  const sections = [...chapters.entries()]
    .sort(([a], [b]) => a - b)
    .map(([chapter, items]) => {
      const sortedItems = [...items].sort(byOrder);
      const entries = sortedItems
        .map((note, index) => renderChapterEntry(note, index + 1, includeDrafts))
        .join('\n');
      const meta = CHAPTER_META[chapter] ?? {
        title: CHAPTER_TITLES[chapter] ?? `فصل ${faDigits(chapter)}`,
        code: `OS${String(chapter).padStart(2, '0')}`,
      };
      return `<section class="os-toc__chapter" aria-labelledby="chapter-${chapter}">
        <header class="os-toc__head">
          <h2 class="os-toc__title" id="chapter-${chapter}">${escapeHtml(meta.title)}</h2>
          <span class="os-toc__code" dir="ltr">${escapeHtml(meta.code)}</span>
        </header>
        <div class="os-toc__list" role="list">${entries}</div>
      </section>`;
    })
    .join('\n');

  const published = includeDrafts ? notes.length : notes.filter((n) => !n.draft).length;
  const drafts = notes.length - published;
  const statusLabel = drafts > 0
    ? `${faDigits(published)} فصل در دسترس · ${faDigits(drafts)} در دست تکمیل`
    : `${faDigits(published)} فصل در دسترس`;

  const replacements = {
    '%%OS_CHAPTERS%%': sections,
    '%%OS_PUBLISHED%%': faDigits(published),
    '%%OS_DRAFTS%%': faDigits(drafts),
    '%%OS_STATUS_LABEL%%': statusLabel,
  };

  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, value);
  }
  return html;
}

function renderPage(note, template, allNotes = []) {
  const title = note.title;
  const summary = note.summary;
  const { html: body, headings } = renderMarkdown(note.body ?? '');
  const dateValue = formatDate(note.date);
  const dateIso = isoDate(note.date);
  const minutes = note.minutes;

  const replacements = {
    '%%TITLE%%': escapeHtml(title),
    '%%SUMMARY%%': escapeHtml(summary),
    '%%DATE_HUMAN%%': escapeHtml(dateValue),
    '%%DATE_ISO%%': dateIso,
    '%%MINUTES%%': faDigits(minutes),
    '%%TAGS%%': renderTags(note.tags),
    '%%MODE_BADGE%%': renderModeBadge(note),
    '%%BODY%%': body,
    '%%TOC%%': renderToc(headings),
    '%%MOBILE_TOC%%': renderMobileToc(headings),
    '%%SERIES_NAV%%': renderSeriesNav(note, allNotes),
    '%%SOURCE%%': renderSource(note),
    '%%ROBOTS%%': '',
    '%%SEO%%': '',
  };

  let html = template;
  for (const [token, value] of Object.entries(replacements)) {
    html = html.replaceAll(token, value);
  }
  return html;
}

async function cleanOutput() {
  await rm(CHAPTERS_DIR, { recursive: true, force: true });
  await rm(INDEX_OUT, { force: true });
}

export async function buildNotes({ clean = true } = {}) {
  await ensureMarked();
  if (clean) await cleanOutput();

  const noteTemplate = existsSync(NOTE_TEMPLATE)
    ? await readFile(NOTE_TEMPLATE, 'utf8')
    : '<!doctype html><html><body>%%BODY%%</body></html>';

  const indexTemplate = existsSync(INDEX_TEMPLATE)
    ? await readFile(INDEX_TEMPLATE, 'utf8')
    : '<!doctype html><html lang="fa" dir="rtl"><body>%%OS_CHAPTERS%%</body></html>';

  const notes = await loadNotes();
  const buildDrafts = process.env.NOTES_DRAFTS === '1';
  const published = notes.filter((n) => !n.draft || buildDrafts);

  await mkdir(CHAPTERS_DIR, { recursive: true });

  const inputs = [INDEX_OUT];

  for (const note of published) {
    const out = outputPath(note.slug);
    await writeFile(out, renderPage(note, noteTemplate, published), 'utf8');
    inputs.push(out);
  }

  await writeFile(INDEX_OUT, renderIndex(notes, indexTemplate, buildDrafts), 'utf8');

  return { notes: published, inputs };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const { notes } = await buildNotes();
  console.log(`[vulkon] generated ${notes.length} chapter(s) and index page.`);
}
