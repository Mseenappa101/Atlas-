import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Printer } from 'lucide-react';
import { TEMPLATES } from '../content/templates';
import { Button } from '../components/app/controls';
import { Modal } from '../components/app/overlays';
import { downloadDoc, printDocument } from '../lib/documents';

const download = (t) => downloadDoc(`firmward-${t.slug}.doc`, t.title, t.body);

export default function Templates() {
  const [open, setOpen] = useState(null);
  const current = TEMPLATES.find((t) => t.slug === open);

  useEffect(() => {
    document.title = 'Templates — Firmward';
  }, []);

  return (
    <div className="app min-h-screen">
      <div className="mx-auto max-w-app px-4 pb-24 pt-6 md:px-6 md:pb-12">
        <h1 className="text-t24 font-bold tracking-tight md:text-t32">Templates</h1>
        <p className="mt-1 max-w-2xl text-t16 text-fg-2">
          Starting points for a 1L search. Replace everything in brackets and cut anything that doesn&rsquo;t sound like you. Downloads open in Word or
          Google Docs.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <li key={t.slug} className="flex flex-col rounded-app border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <FileText size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
                <span className="rounded-pill border border-line px-2 text-t12 text-fg-2">Word .doc</span>
              </div>
              <h2 className="mt-3 text-t16 font-semibold">{t.title}</h2>
              <p className="mt-1 flex-1 text-t14 text-fg-2">{t.description}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" icon={Eye} onClick={() => setOpen(t.slug)} aria-label={`Preview ${t.title}`}>
                  Preview
                </Button>
                <Button variant="ghost" size="sm" icon={Download} onClick={() => download(t)} aria-label={`Download ${t.title}`}>
                  Download
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={Boolean(current)}
        onClose={() => setOpen(null)}
        title={current?.title ?? ''}
        footer={
          current && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" icon={Printer} onClick={printDocument}>
                Save as PDF
              </Button>
              <Button icon={Download} onClick={() => download(current)}>
                Download
              </Button>
            </div>
          )
        }
      >
        {current && (
          <article
            data-printable
            aria-label={`${current.title} template`}
            className="doc-sheet mx-auto max-w-[680px] rounded-app border border-line bg-white px-6 py-8 md:px-12 md:py-10"
            dangerouslySetInnerHTML={{ __html: current.body }}
          />
        )}
      </Modal>
    </div>
  );
}
