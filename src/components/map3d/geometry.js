import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { feature } from 'topojson-client';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import { STATE_BY_NAME } from '../../lib/catalog';

// us-atlas states-albers-10m is pre-projected to a 975×610 frame; map that frame into three world
// units (≈24 wide), centred at the origin, lying in the XZ plane with extrusion rising in +Y.
const FRAME_W = 975, FRAME_H = 610;
const WORLD_W = 24;
const S = WORLD_W / FRAME_W;
export const worldX = (fx) => (fx - FRAME_W / 2) * S;
export const worldZ = (fy) => (fy - FRAME_H / 2) * S;

// Same albers-usa the atlas was built with, so city lon/lat land inside their states.
const projection = geoAlbersUsa().scale(1300).translate([FRAME_W / 2, FRAME_H / 2]);
export function projectCity(lon, lat) {
  const p = projection([lon, lat]);
  return p ? [worldX(p[0]), worldZ(p[1])] : null;
}

const pathGen = geoPath();

// Build one extruded, merged BufferGeometry per state (origin recentred to the state's centroid so it
// can lift/scale about itself), plus centroid world coords. Returns a promise.
export async function buildStates(height = 0.28) {
  const topo = (await import('us-atlas/states-albers-10m.json')).default;
  const features = feature(topo, topo.objects.states).features;
  const out = [];
  for (const f of features) {
    const abbr = STATE_BY_NAME[f.properties.name];
    if (!abbr) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    const geos = [];
    for (const rings of polys) {
      const [outer, ...holes] = rings;
      const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(worldX(x), -worldZ(y))));
      for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(worldX(x), -worldZ(y)))));
      geos.push(new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }));
    }
    if (!geos.length) continue;
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    const [cx, cy] = pathGen.centroid(f);
    out.push({ abbr, name: f.properties.name, geometry: merged, cx: worldX(cx), cz: worldZ(cy) });
  }
  return out;
}
