// A titled section of the application workspace.
export function Card({ title, description, action, children, id }) {
  const headingId = id ?? `card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className="rounded-app border border-line bg-card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={headingId} className="text-t16 font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-t14 text-fg-2">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
