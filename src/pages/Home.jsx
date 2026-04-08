import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';

function useCountUp(target, duration = 1500) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  function start() {
    if (started.current) return;
    started.current = true;
    const t0 = performance.now();
    function tick(now) {
      const p = Math.min((now - t0) / duration, 1);
      setValue(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  return { value, start };
}

const f = (delay) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } });
const sv = (delay) => ({ initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 }, transition: { duration: 0.5, delay } });
const dm = "'DM Mono', monospace";
const cg = "'Cormorant Garamond', Georgia, serif";
const eb = "'EB Garamond', Georgia, serif";

export default function Home() {
  useEffect(() => { document.title = 'Atlas — The 1L Career Operating System'; }, []);

  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.5 });
  const c1 = useCountUp(400);
  const c2 = useCountUp(28);
  const c3 = useCountUp(5);
  useEffect(() => { if (statsInView) { c1.start(); c2.start(); c3.start(); } }, [statsInView]);

  return (
    <div style={{ overflowX: 'hidden' }}>
      {/* HERO */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '5rem 2.5rem', minHeight: '85vh', display: 'flex', alignItems: 'center', gap: '3rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px' }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} style={{ width: 40, height: 1, backgroundColor: '#c4a55a', marginBottom: 24 }} />
          <motion.h1 {...f(0.1)} style={{ fontFamily: cg, fontSize: 58, fontWeight: 300, color: '#1a1710', lineHeight: 1.05, margin: 0 }}>
            The operating system for your<br /><em style={{ color: '#8b6914' }}>legal career.</em>
          </motion.h1>
          <motion.p {...f(0.2)} style={{ fontFamily: eb, fontSize: 17, fontStyle: 'italic', color: '#7a7260', lineHeight: 1.7, margin: '20px 0 28px' }}>
            400+ firms. AI intelligence briefs. Document generation. Your entire 1L recruiting campaign — in one place.
          </motion.p>
          <motion.div {...f(0.3)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/signup" style={{ background: '#1a1710', color: '#c4a55a', fontFamily: dm, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 28px', border: 'none', textDecoration: 'none', cursor: 'pointer' }}>Start for free</Link>
            <Link to="/browse" style={{ border: '1px solid #c8bfae', color: '#7a7260', fontFamily: dm, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 28px', background: 'transparent', textDecoration: 'none' }}>Browse firms</Link>
          </motion.div>
        </div>
        <div style={{ flex: '1 1 340px', position: 'relative', height: 380, minWidth: 300 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} style={{ position: 'absolute', top: 20, right: 60, transform: 'rotate(-2deg)', background: '#1a1710', padding: '1.5rem', width: 280, borderRadius: 2 }}>
            <div style={{ fontFamily: cg, fontSize: 16, color: '#c4a55a' }}>King &amp; Spalding</div>
            <div style={{ fontFamily: dm, fontSize: 8, color: '#4a4639', marginTop: 2 }}>ATLANTA, GA</div>
            <span style={{ fontFamily: dm, fontSize: 8, border: '1px solid #8b6914', color: '#8b6914', padding: '3px 8px', display: 'inline-block', marginTop: 8 }}>1L Program</span>
            <p style={{ fontFamily: eb, fontSize: 12, fontStyle: 'italic', color: '#7a7060', marginTop: 10, lineHeight: 1.5 }}>King &amp; Spalding is an Am Law 25 firm with a storied reputation in corporate transactions and complex litigation...</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} style={{ position: 'absolute', top: 60, right: 20, transform: 'rotate(1deg)', background: '#f0e6c8', border: '1px solid #c4a55a', padding: '1.5rem', width: 260, borderRadius: 2 }}>
            <div style={{ fontFamily: dm, fontSize: 8, color: '#8b6914', textTransform: 'uppercase' }}>Cover Letter</div>
            <p style={{ fontFamily: eb, fontSize: 12, fontStyle: 'italic', color: '#1a1710', marginTop: 6, lineHeight: 1.5 }}>The intersection of King &amp; Spalding's government matters practice and my experience in constitutional law research...</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }} style={{ position: 'absolute', top: 110, right: 40, background: '#faf7f2', border: '1px solid #ddd6c8', padding: '1.5rem', width: 240, borderRadius: 2 }}>
            <div style={{ fontFamily: dm, fontSize: 8, color: '#b0a898', textTransform: 'uppercase', marginBottom: 8 }}>My Firms</div>
            {[['Skadden Arps', 'Applied', '#3a5e34'], ['Davis Polk', 'Researching', '#8b6914'], ['Cravath Swaine', 'Callback', '#1a4a8b']].map(([n, s, c]) => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
                <span style={{ fontFamily: eb, fontSize: 14, color: '#1a1710' }}>{n}</span>
                <span style={{ fontFamily: dm, fontSize: 7, color: c, border: `1px solid ${c}`, padding: '1px 5px', borderRadius: 1 }}>{s}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* STATS BAR */}
      <section ref={statsRef} style={{ background: '#1a1710', borderTop: '1px solid rgba(196,165,90,0.2)', borderBottom: '1px solid rgba(196,165,90,0.2)', padding: '2rem 2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
          {[[c1.value, 'Firms indexed'], [c2.value, 'Markets covered'], [c3.value, 'Document types'], ['Free', 'To get started']].map(([v, l], i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: cg, fontSize: 38, color: '#c4a55a' }}>{v}</div>
              <div style={{ fontFamily: dm, fontSize: 9, textTransform: 'uppercase', color: '#4a4639', letterSpacing: '0.12em', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#f7f3ec', padding: '5rem 2.5rem', textAlign: 'center' }}>
        <span style={{ fontFamily: dm, fontSize: 9, textTransform: 'uppercase', color: '#8b6914', border: '1px solid #c4a55a', padding: '6px 14px', display: 'inline-block', marginBottom: '3rem', letterSpacing: '0.08em' }}>How it works</span>
        <div style={{ display: 'flex', gap: '3rem', maxWidth: 1000, margin: '0 auto', flexWrap: 'wrap', textAlign: 'left' }}>
          {[['01', 'Find your markets', 'Browse every firm that recruits 1Ls across 28 cities. Filter by practice area, fellowship, and program type.'],
            ['02', 'Get the intelligence', 'AI-generated briefs on firm culture, recruiting practices, and what it actually takes to get an offer.'],
            ['03', 'Apply with precision', 'Generate tailored cover letters and cold outreach. Track every application from first contact to offer.']
          ].map(([num, title, body], i) => (
            <motion.div key={num} {...sv(i * 0.1)} style={{ flex: '1 1 260px' }}>
              <div style={{ fontFamily: cg, fontSize: 48, color: '#ede8df', lineHeight: 1 }}>{num}</div>
              <div style={{ fontFamily: cg, fontSize: 20, color: '#1a1710', margin: '8px 0' }}>{title}</div>
              <p style={{ fontFamily: eb, fontSize: 14, fontStyle: 'italic', color: '#7a7260', lineHeight: 1.6, margin: 0 }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: '#faf7f2', padding: '5rem 2.5rem', borderTop: '1px solid #ddd6c8', textAlign: 'center' }}>
        <h2 style={{ fontFamily: cg, fontSize: 36, fontWeight: 300, fontStyle: 'italic', color: '#1a1710', margin: 0 }}>Built for the 1L who intends to win</h2>
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ margin: '1rem auto', display: 'block' }}><rect x="6" y="0" width="6" height="6" transform="rotate(45 6 3)" fill="#c4a55a" /></svg>
        <div style={{ display: 'flex', gap: '1.5rem', maxWidth: 1000, margin: '2rem auto 0', flexWrap: 'wrap' }}>
          {[['Intelligence briefs', 'Comprehensive firm profiles covering culture, Am Law rankings, practice strengths, 1L recruiting timeline, and how to make your application stand out.'],
            ['AI document generation', 'Cover letters, cold outreach, follow-ups, thank you notes, and interview prep — all tailored to your profile and the specific firm.'],
            ['Application CRM', 'A Kanban board to track every firm from research to offer. Set deadlines, add notes, and never miss an application window.']
          ].map(([title, body], i) => (
            <motion.div key={title} {...sv(i * 0.1)} style={{ flex: '1 1 260px', background: '#f7f3ec', border: '1px solid #ddd6c8', padding: '2rem', textAlign: 'left' }}>
              <div style={{ width: 32, height: 32, border: '1px solid #c4a55a', marginBottom: '1rem' }} />
              <div style={{ fontFamily: cg, fontSize: 20, color: '#1a1710' }}>{title}</div>
              <p style={{ fontFamily: eb, fontSize: 14, fontStyle: 'italic', color: '#7a7260', lineHeight: 1.6, marginTop: '0.5rem' }}>{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <motion.section {...sv(0)} style={{ background: '#1a1710', padding: '5rem 2.5rem', textAlign: 'center' }}>
        <h2 style={{ fontFamily: cg, fontSize: 42, fontWeight: 300, color: '#f7f3ec', margin: 0 }}>Your offer is one application away.</h2>
        <p style={{ fontFamily: eb, fontSize: 16, fontStyle: 'italic', color: '#4a4639', marginTop: '1rem' }}>Join the 1Ls who are recruiting smarter.</p>
        <Link to="/signup" style={{ display: 'inline-block', marginTop: '2rem', background: '#c4a55a', color: '#1a1710', fontFamily: dm, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 32px', border: 'none', textDecoration: 'none', cursor: 'pointer' }}>Create your free account</Link>
      </motion.section>

      {/* FOOTER */}
      <footer style={{ background: '#0d0c0a', padding: '2rem 2.5rem', borderTop: '1px solid rgba(196,165,90,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <span style={{ fontFamily: cg, fontSize: 18, color: '#c4a55a', letterSpacing: '0.2em' }}>Atlas</span>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[['Browse', '/browse'], ['Pricing', '/pricing'], ['Sign In', '/login']].map(([t, h]) => (
              <Link key={t} to={h} style={{ fontFamily: dm, fontSize: 9, textTransform: 'uppercase', color: '#4a4639', textDecoration: 'none', letterSpacing: '0.08em' }}>{t}</Link>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1a1710', marginTop: '1.5rem', paddingTop: '1rem', textAlign: 'center' }}>
          <span style={{ fontFamily: dm, fontSize: 9, color: '#2e2b22' }}>&copy; 2025 Atlas. Built for 1Ls.</span>
        </div>
      </footer>
    </div>
  );
}
