import { useEffect } from 'react';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.append(el);
  }
  el.setAttribute('content', content);
}

/** Title, description and indexing for the current page (the build also writes these into each page's HTML). */
export default function usePageMeta({ title, description, noindex = false }) {
  useEffect(() => {
    const full = title.includes('Firmward') ? title : `${title} — Firmward`;
    document.title = full;
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
    }
    setMeta('property', 'og:title', full);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, noindex]);
}
