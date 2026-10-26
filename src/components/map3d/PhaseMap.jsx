import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { buildStates, projectCity } from './geometry';
import { STATE_CITIES, STATE_FIRMS } from './cities';
import './phasemap.css';

const NAV_POS = new THREE.Vector3(0, 19, 15);
const NAV_LOOK = new THREE.Vector3(0, -1, -1.5);
const NAVY = new THREE.Color('#1b273d');
const LIT = new THREE.Color('#2f7d58');
const prefersReduce = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* ── State slabs: lift/sink/fade toward targets driven by `focus` ── */
function States({ states, focus, onPick, counts }) {
  const group = useRef();
  const meshes = useRef([]);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 4);
    meshes.current.forEach((m) => {
      if (!m) return;
      const foc = focus === m.userData.abbr;
      const dim = focus && !foc;
      const ty = foc ? 0.5 : dim ? -2.4 : 0;
      const ts = foc ? 2.4 : 1;
      const to = dim ? 0.12 : 1;
      m.position.y += (ty - m.position.y) * k;
      m.scale.y += (ts - m.scale.y) * k;
      m.material.opacity += (to - m.material.opacity) * k;
    });
  });
  return (
    <group ref={group}>
      {states.map((s, i) => {
        const firms = counts?.[s.abbr] ?? STATE_FIRMS[s.abbr] ?? 0;
        const lit = firms > 0;
        const color = lit ? NAVY.clone().lerp(LIT, Math.min(1, firms / 26)) : NAVY;
        return (
          <mesh
            key={s.abbr}
            ref={(el) => (meshes.current[i] = el)}
            geometry={s.geometry}
            rotation={[-Math.PI / 2, 0, 0]}
            userData={{ abbr: s.abbr }}
            onPointerDown={lit ? (e) => { e.stopPropagation(); onPick(s.abbr); } : undefined}
            onPointerOver={lit ? (e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <meshStandardMaterial
              color={color}
              emissive={lit ? LIT : '#000'}
              emissiveIntensity={lit ? Math.min(0.5, firms / 40) : 0}
              roughness={0.72}
              metalness={0.1}
              transparent
              opacity={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Glowing city pillars over the focused state, sized by firm count ── */
function Cities({ focus, onCity }) {
  const data = focus ? STATE_CITIES[focus] : null;
  const pillars = useMemo(() => {
    if (!data) return [];
    return data.cities.map((c) => {
      const p = projectCity(c.lon, c.lat);
      return p ? { ...c, x: p[0], z: p[1], h: 0.8 + Math.min(3, c.firms / 3.5) } : null;
    }).filter(Boolean);
  }, [data]);
  const refs = useRef([]);
  useFrame((state) => {
    refs.current.forEach((m) => { if (m) m.material.emissiveIntensity = 1.2 + Math.sin(state.clock.elapsedTime * 2 + m.position.x) * 0.3; });
  });
  if (!data) return null;
  return (
    <group>
      {pillars.map((c, i) => (
        <group
          key={c.name}
          position={[c.x, 0, c.z]}
          onPointerDown={(e) => { e.stopPropagation(); onCity(c); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          {/* wide invisible hit target so the thin pillar is easy to click/tap */}
          <mesh position={[0, 0.5 + c.h / 2, 0]}>
            <cylinderGeometry args={[0.6, 0.6, c.h + 1, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.5 + c.h / 2, 0]} ref={(el) => (refs.current[i] = el)}>
            <cylinderGeometry args={[0.13, 0.17, c.h, 16]} />
            <meshStandardMaterial color="#6fe0aa" emissive="#57d29a" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ── Ring of state images surrounding the viewer in the focused state ── */
function ImageRing({ focus, images, center }) {
  const group = useRef();
  const { pointer } = useThree();
  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return (images || []).map((url) => {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    });
  }, [images]);
  useFrame(() => {
    if (!group.current) return;
    const target = focus ? 1 : 0;
    group.current.userData.a = (group.current.userData.a ?? 0) + (target - (group.current.userData.a ?? 0)) * 0.06;
    const a = group.current.userData.a;
    group.current.visible = a > 0.02;
    group.current.children.forEach((pl, i) => {
      pl.material.opacity = a;
      pl.position.y = 3.6 + Math.sin(i) * 0.2 + pointer.y * 0.4;
    });
    group.current.rotation.y += pointer.x * 0.0015;
  });
  if (!focus || !textures.length) return null;
  const n = textures.length;
  const R = 8.2;
  return (
    <group ref={group} position={[center[0], 0, center[1]]}>
      {textures.map((tex, i) => {
        const ang = (i / n) * Math.PI * 2 + Math.PI;
        const x = Math.sin(ang) * R, z = Math.cos(ang) * R;
        return (
          <mesh key={i} position={[x, 3.6, z]} rotation={[0, ang + Math.PI, 0]}>
            <planeGeometry args={[4.4, 3]} />
            <meshBasicMaterial map={tex} transparent opacity={0} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Scripted camera flight between national view and the focused state ── */
function CameraRig({ focus, states }) {
  const { camera } = useThree();
  const target = useRef({ pos: NAV_POS.clone(), look: NAV_LOOK.clone() });
  const look = useRef(NAV_LOOK.clone());
  useEffect(() => {
    if (!focus) { target.current = { pos: NAV_POS.clone(), look: NAV_LOOK.clone() }; return; }
    const s = states.find((x) => x.abbr === focus);
    if (!s) return;
    target.current = {
      pos: new THREE.Vector3(s.cx + 0.5, 6.2, s.cz + 8.4),
      look: new THREE.Vector3(s.cx, 1.2, s.cz),
    };
  }, [focus, states]);
  useFrame((_, dt) => {
    const k = Math.min(1, dt * (prefersReduce() ? 20 : 2.2));
    camera.position.lerp(target.current.pos, k);
    look.current.lerp(target.current.look, k);
    camera.lookAt(look.current);
  });
  return null;
}

function Lamp() {
  const light = useRef();
  const { pointer, viewport } = useThree();
  useFrame(() => {
    if (light.current) { light.current.position.x = pointer.x * viewport.width * 0.5; light.current.position.z = -pointer.y * viewport.height * 0.5; }
  });
  return <pointLight ref={light} position={[0, 9, 0]} intensity={55} distance={38} color="#8fffcf" />;
}

/* ── Public component ── */
export default function PhaseMap({ height = '72vh', counts = null, onOpenDocket = null }) {
  const [states, setStates] = useState(null);
  const [focus, setFocus] = useState(null);
  const [city, setCity] = useState(null);
  const [images, setImages] = useState({});
  const openDocket = (abbr) => { if (onOpenDocket) onOpenDocket(abbr); else window.location.href = '/explore'; };

  useEffect(() => { let live = true; buildStates().then((s) => live && setStates(s)); return () => { live = false; }; }, []);
  // Per-state ring image URLs (populated once the imagery pipeline has emitted them).
  useEffect(() => { fetch('/art/states/index.json').then((r) => r.ok ? r.json() : {}).then(setImages).catch(() => {}); }, []);

  const pick = (abbr) => { setCity(null); setFocus(abbr); };
  const back = () => { if (city) setCity(null); else setFocus(null); };
  // Dev-only hook so automated capture can drive the real animations deterministically.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    window.__pm = {
      pick,
      openCity: (abbr, i = 0) => { setFocus(abbr); const d = STATE_CITIES[abbr]; if (d) setCity(d.cities[i] ?? d.cities[0]); },
      back: () => { setCity(null); setFocus(null); },
    };
  });
  const center = useMemo(() => {
    const s = states?.find((x) => x.abbr === focus);
    return s ? [s.cx, s.cz] : [0, 0];
  }, [states, focus]);

  return (
    <div className="phasemap" style={{ height }}>
      <Canvas camera={{ position: NAV_POS.toArray(), fov: 42, near: 0.1, far: 200 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
        <color attach="background" args={['#0b1120']} />
        <fog attach="fog" args={['#0b1120', 26, 60]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 16, 6]} intensity={1.1} color="#dfe6f2" />
        <Lamp />
        {states && <States states={states} focus={focus} onPick={pick} counts={counts} />}
        {states && <Cities focus={focus} onCity={setCity} />}
        {states && <ImageRing focus={focus} images={focus ? images[focus] : null} center={center} />}
        {states && <CameraRig focus={focus} states={states} />}
      </Canvas>

      {/* overlay: caption / back / case files */}
      <div className="phasemap__hud">
        {!focus && <p className="phasemap__hint">The national docket — select a lit jurisdiction to fly in.</p>}
        {focus && (
          <button className="phasemap__back" onClick={back} type="button">
            ← {city ? STATE_CITIES[focus]?.name : 'National docket'}
          </button>
        )}
        {focus && !city && STATE_CITIES[focus] && <p className="phasemap__state">{STATE_CITIES[focus]?.name} — select a city pillar to open its files.</p>}
        {focus && !city && !STATE_CITIES[focus] && (
          <div className="phasemap__docket">
            <p>{counts?.[focus] ?? 0} firms on the {focus} docket.</p>
            <button type="button" onClick={() => openDocket(focus)}>Open the {focus} docket →</button>
          </div>
        )}
      </div>

      {city && (
        <aside className="phasemap__files" aria-label={`Firms in ${city.name}`}>
          <header>
            <span className="phasemap__files-no ed-smallcaps">{focus} · No. 24</span>
            <h3>{city.name}</h3>
            <p>{city.firms} firms on the docket</p>
          </header>
          <div className="phasemap__filelist">
            {city.cases.map((c, i) => (
              <article key={i} className="phasemap__case">
                <span className="phasemap__case-ex ed-smallcaps">Exhibit {String.fromCharCode(65 + i)}</span>
                <p className="phasemap__case-practice">{c.practice}</p>
                <p className="phasemap__case-hiring">Hiring: {c.hiring}</p>
                <p className="phasemap__case-sealed">Firm name &amp; recruiting contact — <button type="button" className="phasemap__seal" onClick={() => openDocket(focus)}>sealed · unlock</button></p>
              </article>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
