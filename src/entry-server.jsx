import { StrictMode } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { Writable } from 'node:stream';
import { AppShell } from './App.jsx';

// Build-time server render of a single route. renderToPipeableStream + onAllReady waits for React.lazy
// (the Edition page is lazy) and every Suspense boundary to resolve, so we capture the FULL page HTML —
// not a Suspense fallback. The 3D map stays lazy: it's gated by IntersectionObserver, which never fires
// during SSR, so PhaseMap/three.js is never pulled into the server render.
export function render(url) {
  return new Promise((resolve, reject) => {
    let html = '';
    const sink = new Writable({
      write(chunk, _enc, cb) { html += chunk; cb(); },
      final(cb) { cb(); },
    });
    const tree = (
      <StrictMode>
        <StaticRouter location={url}>
          <AppShell />
        </StaticRouter>
      </StrictMode>
    );
    const { pipe, abort } = renderToPipeableStream(tree, {
      onAllReady() {
        pipe(sink);
        sink.on('finish', () => resolve(html));
      },
      onError(err) { reject(err); },
    });
    // Safety valve: never hang the build on a stuck Suspense boundary.
    setTimeout(() => abort(new Error(`SSR timed out for ${url}`)), 15000);
  });
}
