import { useEffect, useState } from 'react';
import { TEMPLATES } from '../content/templates';

// Word and Google Docs both open an HTML document saved with a .doc extension.
function download(t) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${t.title}</title>
<style>body{font-family:Georgia,serif;font-size:11pt;line-height:1.4}h2{text-align:center;font-size:16pt;margin:0}h3{font-size:11pt;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #000;margin:14pt 0 4pt}p{margin:0 0 8pt}.center{text-align:center}ul{margin:0 0 8pt}</style>
</head><body>${t.body}</body></html>`;
  const url = URL.createObjectURL(new Blob(['﻿', html], { type: 'application/msword' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `atlas-${t.slug}.doc` });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Templates() {
  const [open, setOpen] = useState(null);

  useEffect(() => {
    document.title = 'Templates — Atlas';
  }, []);

  return (
    <main className="page pt-8 md:pt-12">
      <header className="mb-8">
        <h1 className="text-xl md:text-2xl">Templates</h1>
        <p className="mt-2 max-w-2xl text-base text-muted">
          Starting points for a 1L search. Replace everything in brackets, and cut anything that doesn&rsquo;t sound like you.
        </p>
      </header>

      <ol className="border-t border-ink">
        {TEMPLATES.map((t) => {
          const isOpen = open === t.slug;
          return (
            <li key={t.slug} className="border-b border-rule py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
                <div className="min-w-0">
                  <h2 className="text-lg">{t.title}</h2>
                  <p className="text-sm text-muted">{t.description}</p>
                </div>
                <div className="no-print flex gap-6 text-sm">
                  <button
                    type="button"
                    className="link min-h-[44px] md:min-h-0"
                    aria-expanded={isOpen}
                    aria-controls={`doc-${t.slug}`}
                    onClick={() => setOpen(isOpen ? null : t.slug)}
                  >
                    {isOpen ? 'Hide' : 'View'}
                  </button>
                  <button type="button" className="link min-h-[44px] md:min-h-0" onClick={() => download(t)}>
                    Download <span className="font-mono text-xs">(.doc)</span>
                  </button>
                </div>
              </div>
              {isOpen && (
                <div id={`doc-${t.slug}`} className="mt-5">
                  <article
                    aria-label={`${t.title} template`}
                    className="doc-sheet mx-auto max-w-[680px] border border-rule bg-white px-6 py-8 md:px-14 md:py-12"
                    dangerouslySetInnerHTML={{ __html: t.body }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
