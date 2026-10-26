import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATE_NAMES } from '../lib/catalog';
import './credits.css';

// A themed "table of authorities" for the site's imagery. Every plate and ring image is Public Domain,
// CC0, or CC BY (attribution given here); CC BY-SA is excluded upstream. Data is the build-time
// public/art/credits.json emitted by scripts/gen-legal-art.mjs — the single source of provenance.

function licenseClass(lic) {
  if (/\bBY\b/i.test(lic) && !/BY-SA/i.test(lic)) return 'cr-lic--by';
  if (/CC0/i.test(lic)) return 'cr-lic--cc0';
  return 'cr-lic--pd';
}

function Entry({ item, i }) {
  return (
    <li className="cr-item" style={{ '--i': i }}>
      <p className="cr-item__subject">{item.subject}</p>
      <p className="cr-item__meta">
        <span className="cr-item__title">“{item.title}”</span>
        {item.creator ? <span className="cr-item__by"> — {item.creator}</span> : null}
      </p>
      <p className="cr-item__foot">
        <span className={`cr-lic ${licenseClass(item.license)}`}>{item.license}</span>
        {item.creditRequired && <span className="cr-item__req">attribution shown</span>}
        <a className="cr-item__src" href={item.sourcePage} target="_blank" rel="noopener noreferrer">Source ↗</a>
      </p>
    </li>
  );
}

export default function Credits() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    document.title = 'Plate credits — Firmward';
    fetch('/art/credits.json').then((r) => (r.ok ? r.json() : Promise.reject())).then(setData).catch(() => setError(true));
  }, []);

  const states = data ? Object.entries(data.states).filter(([, imgs]) => imgs.length) : [];

  return (
    <div className="cr">
      <header className="cr__head">
        <p className="cr__ex ed-smallcaps">Exhibit · Provenance</p>
        <h1 className="cr__h1">Table of Authorities</h1>
        <p className="cr__lede">
          Every plate and map image on Firmward is used under <strong>Public Domain</strong>, <strong>CC0</strong>, or
          <strong> CC BY</strong> (attribution given below). Images were sourced via Wikimedia Commons — chiefly U.S.
          government works, the Supreme Court, and Carol M. Highsmith’s Library of Congress collection — then resized for
          the web; chapter plates were additionally processed into line-art. <strong>CC BY-SA</strong> images were
          deliberately excluded to avoid share-alike obligations on derivatives.
        </p>
        <p className="cr__back"><Link to="/explore">← Back to the docket</Link></p>
      </header>

      {error && <p className="cr__note">Couldn’t load the credits manifest. See <code>public/art/CREDITS.md</code> in the repository.</p>}
      {!data && !error && <p className="cr__note">Loading the record…</p>}

      {data && (
        <>
          <section className="cr__section">
            <h2 className="cr__h2 ed-smallcaps">Chapter plates</h2>
            <ul className="cr-list">{data.plates.map((p, i) => <Entry key={p.slug ?? i} item={p} i={i} />)}</ul>
          </section>

          <section className="cr__section">
            <h2 className="cr__h2 ed-smallcaps">State map — ring imagery</h2>
            {states.map(([st, imgs]) => (
              <div key={st} className="cr-state">
                <h3 className="cr-state__h">{STATE_NAMES[st] ?? st}<span className="cr-state__ab">{st}</span></h3>
                <ul className="cr-list">{imgs.map((img, i) => <Entry key={img.url} item={img} i={i} />)}</ul>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
