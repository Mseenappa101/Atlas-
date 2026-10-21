import useInViewOnce from '../../lib/useInViewOnce';

// Fade-up reveal driven by CSS + IntersectionObserver (no Framer Motion). `.reveal` starts hidden; the
// `.is-in` class runs the keyframe. Reduced motion / no-JS fall back to visible (see index.css).
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const [ref, inView] = useInViewOnce();
  return (
    <Tag ref={ref} className={`reveal ${inView ? 'is-in' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
