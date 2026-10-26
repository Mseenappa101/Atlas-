import { useViewProgress } from './hooks';

/**
 * A chapter's figure: the etched line-art plate crossfades to the full-colour
 * public-domain painting as it scrolls through the viewport (`--reveal`, driven
 * by useViewProgress). Both images are declared with width/height to hold space
 * (no CLS); the colour plate is lazy so only the visible chapter pays for it.
 */
export default function ArtPlate({ slug, alt, eager = false }) {
  const ref = useViewProgress();
  const base = `/art/${slug}`;
  return (
    <figure ref={ref} className="ed-plate" style={{ '--reveal': 0 }}>
      <img
        className="ed-plate__img ed-plate__line"
        src={`${base}/line-1024.webp`}
        alt=""
        aria-hidden="true"
        width={1024}
        height={1365}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <img
        className="ed-plate__img ed-plate__color"
        src={`${base}/color-1024.webp`}
        srcSet={`${base}/color-640.webp 640w, ${base}/color-1024.webp 1024w, ${base}/color-1600.webp 1600w`}
        sizes="(max-width: 900px) 90vw, 40vw"
        alt={alt}
        width={1024}
        height={1365}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className="ed-plate__frame" aria-hidden="true" />
    </figure>
  );
}
