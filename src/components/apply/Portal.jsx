import { useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Button, ButtonLink } from '../app/controls';
import { Card } from './Card';
import { portalUrl } from '../../lib/application';

const longDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Portal({ firm, row, attachmentNames, onSubmitted }) {
  const url = portalUrl(firm);
  const [busy, setBusy] = useState(false);
  const submitted = ['applied', 'interviewing', 'offer'].includes(row.status) && row.applied_at;

  return (
    <Card title="Apply on the firm’s site" description={`${firm.name} takes applications through its own website. Firmward keeps everything else in one place.`}>
      <ol className="space-y-4">
        <li className="flex gap-3">
          <span className="data flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-tint text-t12 font-medium text-brand">1</span>
          <div className="text-t14">
            <p className="font-medium">Download your materials</p>
            <p className="mt-0.5 text-fg-2">
              {attachmentNames.length ? `Use the Download buttons under Materials: ${attachmentNames.join(', ')}.` : 'Choose your resume and cover letter under Materials, then download them.'}
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="data flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-tint text-t12 font-medium text-brand">2</span>
          <div className="text-t14">
            <p className="font-medium">Fill in {firm.name}&rsquo;s application</p>
            {url ? (
              <div className="mt-2">
                <ButtonLink href={url} variant="secondary" size="sm" icon={ExternalLink}>
                  Open the application
                </ButtonLink>
              </div>
            ) : (
              <p className="mt-0.5 text-fg-2">We don&rsquo;t have a link for this firm yet. Search for &ldquo;{firm.name} summer associate&rdquo;.</p>
            )}
          </div>
        </li>
        <li className="flex gap-3">
          <span className="data flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-brand-tint text-t12 font-medium text-brand">3</span>
          <div className="text-t14">
            <p className="font-medium">Mark it submitted</p>
            {submitted ? (
              <p className="mt-1 flex items-center gap-1.5 font-medium text-brand">
                <CheckCircle2 size={16} aria-hidden="true" /> Submitted {longDate(row.applied_at)}
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-fg-2">So your list, deadlines and reminders stay accurate.</p>
                <div className="mt-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await onSubmitted();
                      setBusy(false);
                    }}
                  >
                    I submitted my application
                  </Button>
                </div>
              </>
            )}
          </div>
        </li>
      </ol>
    </Card>
  );
}
