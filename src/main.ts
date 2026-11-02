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

function initTheme(): void {
  const toggleBtn = document.querySelector<HTMLButtonElement>('#theme-toggle');
  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  function updateMeta(isDark: boolean): void {
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#171614' : '#F3EFE6');
    }
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      updateMeta(nextTheme === 'dark');
      try {
        localStorage.setItem('vulkon-theme', nextTheme);
      } catch {
        // Ignore localStorage error
      }
    });
  }

  try {
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkQuery.addEventListener('change', (e) => {
      try {
        if (!localStorage.getItem('vulkon-theme')) {
          const next = e.matches ? 'dark' : 'light';
          document.documentElement.setAttribute('data-theme', next);
          updateMeta(e.matches);
        }
      } catch {
        // Ignore
      }
    });
  } catch {
    // Ignore
  }
}

function initToc(): void {
  const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.note-toc__link'));
  const headings = Array.from(document.querySelectorAll<HTMLElement>('.prose h2[id], .prose h3[id]'));

  // Mobile TOC auto-close on link click
  const mobileLinks = document.querySelectorAll<HTMLAnchorElement>('.mobile-toc__link');
  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const details = link.closest<HTMLDetailsElement>('details.mobile-toc');
      if (details) details.removeAttribute('open');
    });
  });

  if (tocLinks.length === 0 || headings.length === 0) return;

  const linkById = new Map<string, HTMLAnchorElement>();
  tocLinks.forEach((link) => {
    const target = link.getAttribute('data-toc-target') || link.getAttribute('href')?.replace('#', '');
    if (target) linkById.set(decodeURIComponent(target), link);
  });

  let activeHeadingId = '';

  function updateActiveHeading(): void {
    const scrollPos = window.scrollY + 120;
    let current = '';

    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      if (heading.offsetTop <= scrollPos) {
        current = heading.id;
      } else {
        break;
      }
    }

    if (!current && headings.length > 0) {
      current = headings[0].id;
    }

    if (current !== activeHeadingId) {
      activeHeadingId = current;
      tocLinks.forEach((link) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });

      const activeLink = linkById.get(current);
      if (activeLink) {
        activeLink.classList.add('is-active');
        activeLink.setAttribute('aria-current', 'location');

        const aside = document.querySelector<HTMLElement>('.note__sidebar');
        if (aside && aside.scrollHeight > aside.clientHeight) {
          const linkTop = activeLink.offsetTop;
          const asideTop = aside.scrollTop;
          const asideHeight = aside.clientHeight;
          if (linkTop < asideTop || linkTop > asideTop + asideHeight - 40) {
            aside.scrollTo({ top: Math.max(0, linkTop - 80), behavior: 'smooth' });
          }
        }
      }
    }
  }

  window.addEventListener(
    'scroll',
    () => {
      requestAnimationFrame(updateActiveHeading);
    },
    { passive: true }
  );

  updateActiveHeading();
}

initCodeCopy();
initTheme();
initToc();
