import './style.css';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;

function markReady(): void {
  root.classList.add('is-ready');
}

if (reduceMotion.matches) {
  markReady();
} else {
  const fallback = new Promise<void>((resolve) => window.setTimeout(resolve, 900));
  Promise.race([document.fonts.ready.then(() => undefined), fallback]).then(markReady);
}

const progress = document.querySelector<HTMLElement>('#progress span');
const masthead = document.querySelector<HTMLElement>('#masthead');
let ticking = false;

function updateScrollState(): void {
  const scrollTop = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = max > 0 ? Math.min(scrollTop / max, 1) : 0;

  if (progress) progress.style.width = `${ratio * 100}%`;
  if (masthead) masthead.classList.toggle('is-stuck', scrollTop > 8);
}

window.addEventListener(
  'scroll',
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateScrollState();
      ticking = false;
    });
  },
  { passive: true }
);

updateScrollState();

const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');

if (!('IntersectionObserver' in window) || reduceMotion.matches) {
  reveals.forEach((el) => el.classList.add('is-in'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  );

  reveals.forEach((el) => revealObserver.observe(el));
}

const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'));
const sections = navLinks
  .map((link) => {
    const id = link.getAttribute('href')?.replace('#', '');
    const section = id ? document.getElementById(id) : null;
    return section ? { link, section } : null;
  })
  .filter((pair): pair is { link: HTMLAnchorElement; section: HTMLElement } => pair !== null);

if ('IntersectionObserver' in window && sections.length > 0) {
  const visible = new Map<string, number>();

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        visible.set(entry.target.id, entry.intersectionRatio);
      });

      let activeId = '';
      let best = 0;
      visible.forEach((ratio, id) => {
        if (ratio > best) {
          best = ratio;
          activeId = id;
        }
      });

      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
      });
    },
    { threshold: [0, 0.15, 0.35, 0.6, 0.85, 1], rootMargin: '-20% 0px -45% 0px' }
  );

  sections.forEach(({ section }) => navObserver.observe(section));
}

function initCodeCopy(): void {
  const blocks = document.querySelectorAll<HTMLPreElement>('.prose pre');
  if (blocks.length === 0) return;

  blocks.forEach((pre) => {
    if (pre.parentElement?.classList.contains('code')) return;

    const wrap = document.createElement('div');
    wrap.className = 'code';
    pre.replaceWith(wrap);
    wrap.appendChild(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code__copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');

    let timer = 0;

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        button.textContent = 'Copied';
        button.classList.add('is-copied');
      } catch {
        button.textContent = 'Failed';
      }

      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('is-copied');
      }, 1800);
    });

    wrap.appendChild(button);
  });
}

initCodeCopy();
