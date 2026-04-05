const pulseStyle = {
  animation: 'skeletonPulse 1.5s ease-in-out infinite',
  backgroundColor: '#e4ddd1',
  borderRadius: 4,
};

const keyframes = `
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}`;

function SkeletonBlock({ width = '100%', height = 20, style = {} }) {
  return <div style={{ ...pulseStyle, width, height, ...style }} />;
}

export default function LoadingSkeleton({ variant = 'text' }) {
  return (
    <>
      <style>{keyframes}</style>
      {variant === 'text' && <SkeletonBlock height={16} />}
      {variant === 'card' && <SkeletonBlock height={100} />}
      {variant === 'page' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '2rem' }}>
          <SkeletonBlock height={32} width="40%" />
          <SkeletonBlock height={16} width="60%" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} height={100} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
