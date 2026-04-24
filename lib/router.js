// lib/router.js — deterministic placer + router
// Takes the AI-generated netlist + components and produces:
//   1. A clean, connectivity-ordered schematic layout
//   2. A shelf-packed compact PCB layout (minimized area → lower fab cost)
//   3. Guaranteed-connecting orthogonal wires and PCB traces

// ── Schematic pin offsets from component origin ───────────────────────────
const SCH_PINS = {
  resistor: {
    horizontal: { 1: [-35, 0], 2: [35, 0] },
    vertical:   { 1: [0, -35], 2: [0, 35] },
  },
  capacitor: {
    horizontal: { 1: [-30, 0], 2: [30, 0] },
    vertical:   { 1: [0, -30], 2: [0, 30] },
  },
  capacitor_pol: {
    vertical: { 1: [0, -30], 2: [0, 30], '+': [0, -30], '-': [0, 30] },
  },
  electrolytic: {
    vertical: { 1: [0, -30], 2: [0, 30], '+': [0, -30], '-': [0, 30] },
  },
  inductor: {
    horizontal: { 1: [-35, 0], 2: [35, 0] },
    vertical:   { 1: [0, -35], 2: [0, 35] },
  },
  led: {
    default: { A: [0, -35], K: [0, 35], 1: [0, -35], 2: [0, 35] },
  },
  diode: {
    default: { A: [0, -35], K: [0, 35], 1: [0, -35], 2: [0, 35] },
  },
  transistor_npn: {
    default: { B: [-25, 0], C: [14, -35], E: [14, 35], 1: [-25, 0], 2: [14, -35], 3: [14, 35] },
  },
  transistor_pnp: {
    default: { B: [-25, 0], C: [14, -35], E: [14, 35], 1: [-25, 0], 2: [14, -35], 3: [14, 35] },
  },
  mosfet_n: {
    default: { G: [-25, 0], D: [14, -35], S: [14, 35], 1: [-25, 0], 2: [14, -35], 3: [14, 35] },
  },
  op_amp: {
    default: { '+': [-42, -14], '-': [-42, 14], 'IN+': [-42, -14], 'IN-': [-42, 14],
               OUT: [40, 0], VCC: [-4, -32], VEE: [-4, 32], 'V+': [-4, -32], 'V-': [-4, 32],
               1: [-42, 14], 2: [-42, -14], 3: [40, 0], 4: [-4, 32], 5: [-4, -32] },
  },
  ic_dip8: {
    default: { 1: [-35, -24], 2: [-35, -8], 3: [-35, 8], 4: [-35, 24],
               5: [35, 24], 6: [35, 8], 7: [35, -8], 8: [35, -24],
               GND: [-35, 24], VCC: [35, -24], TRIG: [-35, -8], OUT: [-35, 8],
               RESET: [-35, 24], CV: [35, 24], THRES: [35, 8], DIS: [35, -8] },
  },
  ic_soic8: {
    default: { 1: [-35, -24], 2: [-35, -8], 3: [-35, 8], 4: [-35, 24],
               5: [35, 24], 6: [35, 8], 7: [35, -8], 8: [35, -24] },
  },
  ic_dip14: {
    default: pinGrid(14, 40, 14),
  },
  ic_dip16: {
    default: pinGrid(16, 40, 14),
  },
  voltage_reg: {
    default: { IN: [-40, 0], OUT: [40, 0], GND: [0, 35], VIN: [-40, 0], VOUT: [40, 0],
               1: [-40, 0], 2: [0, 35], 3: [40, 0] },
  },
  connector: {
    default: connectorPins(16),
  },
  crystal: {
    horizontal: { 1: [-30, 0], 2: [30, 0] },
  },
  battery: {
    default: { '+': [0, -35], '-': [0, 35], 1: [0, -35], 2: [0, 35] },
  },
  switch: {
    horizontal: { 1: [-28, 0], 2: [28, 0] },
    vertical:   { 1: [0, -28], 2: [0, 28] },
  },
};

function pinGrid(pinCount, halfW, spacing) {
  const map = {};
  const half = pinCount / 2;
  const totalH = (half - 1) * spacing + 24;
  const top = -totalH / 2;
  for (let i = 0; i < half; i++) {
    const y = top + 12 + i * spacing;
    map[i + 1]          = [-halfW + 5, y];
    map[pinCount - i]   = [ halfW - 5, y];
  }
  return map;
}

function connectorPins(max) {
  const m = {};
  for (let i = 1; i <= max; i++) m[i] = [-26, (i - 1) * 14 - ((max - 1) * 14) / 2];
  return m;
}

// ── Component bounding box (schematic) ────────────────────────────────────
// Half-width / half-height — used for grid spacing to prevent body overlap
const SCH_BBOX = {
  resistor:       { horizontal: [45, 20], vertical: [20, 45] },
  capacitor:      { horizontal: [40, 20], vertical: [20, 40] },
  capacitor_pol:  { vertical: [20, 40] },
  electrolytic:   { vertical: [20, 40] },
  inductor:       { horizontal: [45, 20], vertical: [20, 45] },
  led:            { default: [18, 45] },
  diode:          { default: [18, 45] },
  transistor_npn: { default: [35, 40] },
  transistor_pnp: { default: [35, 40] },
  mosfet_n:       { default: [35, 40] },
  op_amp:         { default: [50, 40] },
  ic_dip8:        { default: [45, 40] },
  ic_soic8:       { default: [45, 40] },
  ic_dip14:       { default: [50, 60] },
  ic_dip16:       { default: [55, 70] },
  voltage_reg:    { default: [50, 45] },
  connector:      { default: [35, 120] },
  crystal:        { horizontal: [40, 20] },
  battery:        { default: [25, 45] },
  switch:         { horizontal: [35, 20], vertical: [20, 35] },
};
function schBBox(comp) {
  const m = SCH_BBOX[comp.type] || {};
  return m[comp.orient] || m.default || m.horizontal || m.vertical || [40, 30];
}

// ── Classification helpers ────────────────────────────────────────────────
function isPowerNet(name) {
  if (!name) return false;
  const n = name.toUpperCase();
  if (n === 'VCC' || n === 'VDD' || n === 'VEE' || n === 'VSS') return true;
  if (n === 'GND' || n === 'AGND' || n === 'DGND') return false;
  if (n.startsWith('+') && /^\+?\d/.test(n.replace(/^\+/, ''))) return true;
  return false;
}
function isGndNet(name) {
  if (!name) return false;
  const n = name.toUpperCase();
  return n === 'GND' || n === 'GND1' || n === 'AGND' || n === 'DGND' || n === 'VSS';
}
function isHubType(type) {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.startsWith('ic_') || t === 'op_amp' || t === 'voltage_reg' ||
         t.includes('mcu') || t.includes('555');
}

// ── Absolute pin coordinates on the schematic ─────────────────────────────
function schPinAbs(circuit, pinRef) {
  if (!circuit.schematic) return null;
  const [compId, pinName] = String(pinRef).split('.');
  const comp = (circuit.schematic.components || []).find(c =>
    c.id === compId || c.label === compId);
  if (!comp) return null;
  const typeMap = SCH_PINS[comp.type] || {};
  const orientMap = typeMap[comp.orient] || typeMap.default ||
                    typeMap.horizontal || typeMap.vertical || {};
  const offset = orientMap[pinName] || orientMap[String(pinName).toUpperCase()];
  if (!offset) return null;
  return [comp.x + offset[0], comp.y + offset[1], comp.id];
}

// ── Absolute pad coordinates on the PCB ───────────────────────────────────
function pcbPadAbs(circuit, pinRef) {
  if (!circuit.pcb) return null;
  const [compId, pinName] = String(pinRef).split('.');
  const comp = (circuit.pcb.components || []).find(c => c.id === compId);
  if (!comp) return null;
  const pads = comp.pads || [];
  let pad = pads.find(p => String(p.num) === String(pinName));
  if (!pad) {
    const aliases = {
      VCC: [8, 14, 16], GND: [1, 4, 7, 8],
      TRIG: [2], OUT: [3], RESET: [4], CV: [5], THRES: [6], DIS: [7],
      IN: [1], VIN: [1], VOUT: [3],
      A: [1], K: [2], '+': [1], '-': [2],
      B: [1], C: [2], E: [3], G: [1], D: [2], S: [3]
    };
    const candidates = aliases[String(pinName).toUpperCase()] || [];
    for (const n of candidates) {
      pad = pads.find(p => String(p.num) === String(n));
      if (pad) break;
    }
  }
  if (!pad) return null;
  return [pad.x, pad.y, comp.id];
}

// ── Build adjacency graph from netlist (excluding power rails) ────────────
function buildAdjacency(circuit) {
  const adj = {};
  const degree = {};
  const comps = (circuit.schematic && circuit.schematic.components) || [];
  comps.forEach(c => { adj[c.id] = new Set(); degree[c.id] = 0; });

  (circuit.netlist || []).forEach(net => {
    const upper = String(net.net || '').toUpperCase();
    const ids = [...new Set((net.pins || []).map(p => String(p).split('.')[0]))];
    ids.forEach(id => { if (degree[id] !== undefined) degree[id]++; });
    if (isPowerNet(upper) || isGndNet(upper)) return; // power rails: don't tangle signal layout
    for (const a of ids) {
      for (const b of ids) {
        if (a !== b && adj[a] && adj[b]) { adj[a].add(b); adj[b].add(a); }
      }
    }
  });

  return { adj, degree };
}

// ── SCHEMATIC PLACEMENT ───────────────────────────────────────────────────
// Strategy: BFS from highest-degree hub → group-by-connectivity → pack onto
// a column-major grid with enough spacing that component bodies never touch.
function placeSchematic(circuit) {
  if (!circuit.schematic) circuit.schematic = { components: [] };
  const sch = circuit.schematic;
  const comps = sch.components || [];
  if (comps.length === 0) return circuit;

  const { adj, degree } = buildAdjacency(circuit);

  // Orient 2-pin polarized components vertically, rest horizontally
  comps.forEach(c => {
    if (!c.orient) {
      if (c.type === 'capacitor_pol' || c.type === 'electrolytic' ||
          c.type === 'led' || c.type === 'diode' || c.type === 'battery') {
        c.orient = 'vertical';
      } else if (c.type === 'resistor' || c.type === 'capacitor' ||
                 c.type === 'inductor' || c.type === 'crystal' ||
                 c.type === 'switch') {
        c.orient = 'horizontal';
      }
    }
  });

  // BFS ordering from highest-degree hub
  const byDegree = [...comps].sort((a, b) => {
    const hubA = isHubType(a.type) ? 1 : 0;
    const hubB = isHubType(b.type) ? 1 : 0;
    if (hubA !== hubB) return hubB - hubA;
    return (degree[b.id] || 0) - (degree[a.id] || 0);
  });

  const order = [];
  const visited = new Set();
  for (const seed of byDegree) {
    if (visited.has(seed.id)) continue;
    const queue = [seed.id];
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      order.push(id);
      const neighbors = [...(adj[id] || [])]
        .filter(n => !visited.has(n))
        .sort((a, b) => (degree[b] || 0) - (degree[a] || 0));
      queue.push(...neighbors);
    }
  }
  comps.forEach(c => { if (!visited.has(c.id)) order.push(c.id); });

  // Grid parameters — wide enough that worst-case IC bodies never touch.
  // ICs are ~110 tall, connectors can be 240 tall → use 160 row pitch,
  // bump for any wide component dynamically.
  const COL_W = 170;
  const ROW_H = 160;
  const MARGIN_X = 140;
  const MARGIN_Y = 140;

  // Choose columns so the layout is roughly square
  const COLS = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(order.length * 0.9))));

  // Place in row-major so each row is a BFS frontier "layer"
  order.forEach((id, i) => {
    const comp = comps.find(c => c.id === id);
    if (!comp) return;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    comp.x = MARGIN_X + col * COL_W;
    comp.y = MARGIN_Y + row * ROW_H;
  });

  const totalRows = Math.ceil(order.length / COLS);
  sch.width = MARGIN_X * 2 + (COLS - 1) * COL_W + 200;   // space on right for net labels
  sch.height = MARGIN_Y * 2 + (totalRows - 1) * ROW_H + 100; // space top/bot for power rails

  // Position power rails on top (VCC) and bottom (GND), horizontally centered
  const centerX = sch.width / 2;
  sch.power_rails = [
    { type: 'vcc', x: centerX, y: 60, label: 'VCC' },
    { type: 'gnd', x: centerX, y: sch.height - 60, label: 'GND' },
  ];

  return circuit;
}

// ── PCB FOOTPRINT BBOX ────────────────────────────────────────────────────
// Returns the footprint's total bounding box (w, h in SVG units)
function pcbBBox(comp) {
  const pads = comp.pads || [];
  if (pads.length === 0) {
    // Fallback based on package
    const fallback = {
      '0805': [40, 24], '0603': [32, 20], '0402': [24, 16],
      'SOIC-8': [60, 50], 'SOIC-14': [80, 50], 'SOIC-16': [90, 50],
      'DIP-8': [100, 90], 'DIP-14': [80, 160], 'DIP-16': [80, 180],
      'TO-220': [70, 40], 'TO-92': [30, 30], 'SOT-23': [30, 26],
      'QFP-32': [90, 90], 'electrolytic_radial': [60, 60],
    };
    return fallback[comp.package] || [40, 40];
  }
  const xs = pads.flatMap(p => [p.x - (p.w || 10) / 2, p.x + (p.w || 10) / 2]);
  const ys = pads.flatMap(p => [p.y - (p.h || 10) / 2, p.y + (p.h || 10) / 2]);
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}

// ── PCB PLACEMENT — shelf bin-packing for compact layout ──────────────────
// JLCPCB pricing tiers are area-based — we minimize board_w × board_h.
// Algorithm: shelf-pack components sorted by height descending into rows
// whose width is chosen to produce a roughly square board.
function placePCB(circuit) {
  if (!circuit.pcb) return circuit;
  const pcb = circuit.pcb;
  const comps = pcb.components || [];
  if (comps.length === 0) return circuit;

  const MARGIN = 35;           // board-edge clearance (SVG units)
  const GAP = 12;              // min space between components on shelf
  const SHELF_GAP = 18;        // min vertical space between shelves

  // Compute bbox for each component (also used to re-center pads)
  const items = comps.map(c => {
    const [w, h] = pcbBBox(c);
    // Use max so rotation doesn't matter much; ensure minimum
    return { comp: c, w: Math.max(w, 24), h: Math.max(h, 24) };
  });

  // Sort by area desc (largest first = better packing)
  items.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  // Target ~square: shelfW such that area / shelfW ≈ shelfW
  const totalArea = items.reduce((s, it) => s + (it.w + GAP) * (it.h + SHELF_GAP), 0);
  let shelfW = Math.ceil(Math.sqrt(totalArea * 1.15));
  // Never narrower than the widest single component
  const maxItemW = items.reduce((m, it) => Math.max(m, it.w), 0);
  shelfW = Math.max(shelfW, maxItemW);

  // Pack into shelves
  let curX = 0, curY = 0, shelfH = 0;
  const placements = new Map();
  for (const it of items) {
    if (curX + it.w > shelfW && curX > 0) {
      curY += shelfH + SHELF_GAP;
      curX = 0;
      shelfH = 0;
    }
    const cx = MARGIN + curX + it.w / 2;
    const cy = MARGIN + curY + it.h / 2;
    placements.set(it.comp.id, { x: cx, y: cy });
    curX += it.w + GAP;
    shelfH = Math.max(shelfH, it.h);
  }
  const usedW = shelfW;
  const usedH = curY + shelfH;

  // Re-center each component and its pads about the new location
  comps.forEach(c => {
    const p = placements.get(c.id);
    if (!p) return;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    c.x = Math.round(p.x);
    c.y = Math.round(p.y);
    (c.pads || []).forEach(pad => {
      pad.x = Math.round(pad.x + dx);
      pad.y = Math.round(pad.y + dy);
    });
  });

  // Tightly fit the board
  pcb.board_width  = Math.max(200, Math.ceil(usedW + MARGIN * 2));
  pcb.board_height = Math.max(150, Math.ceil(usedH + MARGIN * 2));
  pcb.margin = MARGIN;

  return circuit;
}

// ── Schematic wire routing ────────────────────────────────────────────────
function routeSchematicWires(circuit) {
  const wires = [];
  const sch = circuit.schematic || {};
  const nets = circuit.netlist || [];

  const vccY = 60;
  const gndY = (sch.height || 620) - 60;

  // Power-rail anchors (from schematic.power_rails)
  const powerAnchors = {};
  (sch.power_rails || []).forEach(r => {
    const net = (r.label || (r.type === 'gnd' ? 'GND' : 'VCC')).toUpperCase();
    if (!powerAnchors[net]) powerAnchors[net] = [];
    powerAnchors[net].push([r.x, r.y]);
  });

  // Track which Y-rows are already used as horizontal trunks so signal nets
  // don't all stack on the same line.
  const usedTrunkYs = new Set();
  function findFreeTrunkY(centerY) {
    // Snap to 10-unit grid; if occupied, probe ±10, ±20, … up to 60.
    const base = Math.round(centerY / 10) * 10;
    for (let d = 0; d <= 60; d += 10) {
      if (!usedTrunkYs.has(base + d)) { usedTrunkYs.add(base + d); return base + d; }
      if (d > 0 && !usedTrunkYs.has(base - d)) { usedTrunkYs.add(base - d); return base - d; }
    }
    usedTrunkYs.add(base);
    return base;
  }

  nets.forEach(net => {
    const upper = String(net.net || '').toUpperCase();
    const pins = (net.pins || []).map(p => schPinAbs(circuit, p)).filter(Boolean);
    if (pins.length === 0) return;

    if (isPowerNet(upper) || isGndNet(upper)) {
      const railY = isGndNet(upper) ? gndY : vccY;
      // Drop each pin vertically to the rail
      pins.forEach(([x, y]) => {
        if (y !== railY) wires.push({ x1: x, y1: y, x2: x, y2: railY });
      });
      // Horizontal trunk spanning the pins
      const xs = pins.map(p => p[0]);
      const minX = Math.min(...xs), maxX = Math.max(...xs);
      if (minX !== maxX) wires.push({ x1: minX, y1: railY, x2: maxX, y2: railY });
      // Hook to the nearest power symbol if available
      const anchors = powerAnchors[upper] ||
                      (isGndNet(upper) ? powerAnchors.GND : powerAnchors.VCC) || [];
      if (anchors.length) {
        const a = anchors.reduce((best, p) => {
          const bx = (minX + maxX) / 2;
          return (Math.abs(p[0] - bx) < Math.abs(best[0] - bx)) ? p : best;
        });
        if (a[1] !== railY) wires.push({ x1: a[0], y1: a[1], x2: a[0], y2: railY });
        if (a[0] < minX || a[0] > maxX) {
          wires.push({ x1: Math.min(a[0], minX), y1: railY, x2: Math.max(a[0], maxX), y2: railY });
        }
      }
    } else {
      // Signal net: connect pins via a shared horizontal trunk
      if (pins.length < 2) return;
      const ys = pins.map(p => p[1]);
      const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
      const trunkY = findFreeTrunkY(centerY);

      pins.forEach(([x, y]) => {
        if (y !== trunkY) wires.push({ x1: x, y1: y, x2: x, y2: trunkY });
      });
      const xs = pins.map(p => p[0]).sort((a, b) => a - b);
      if (xs[0] !== xs[xs.length - 1]) {
        wires.push({ x1: xs[0], y1: trunkY, x2: xs[xs.length - 1], y2: trunkY });
      }
    }
  });

  return wires;
}

// ── PCB trace routing ─────────────────────────────────────────────────────
function routePCBTraces(circuit) {
  const traces = [];
  const nets = circuit.netlist || [];

  nets.forEach(net => {
    const pads = (net.pins || []).map(p => pcbPadAbs(circuit, p)).filter(Boolean);
    if (pads.length < 2) return;

    const upper = String(net.net).toUpperCase();
    const isPower = isPowerNet(upper);
    const isGnd = isGndNet(upper);
    const width = (isPower || isGnd) ? 0.5 : 0.3;
    const layer = isGnd ? 'back' : 'front';

    // Minimum-spanning-tree-ish chain: nearest-neighbor from leftmost pad
    const remaining = [...pads];
    remaining.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    let current = remaining.shift();
    while (remaining.length) {
      // Pick the closest remaining pad
      let bestIdx = 0, bestD = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = Math.abs(remaining[i][0] - current[0]) + Math.abs(remaining[i][1] - current[1]);
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      const [x1, y1] = current;
      const [x2, y2] = next;
      const points = (x1 === x2 || y1 === y2)
        ? [[x1, y1], [x2, y2]]
        : [[x1, y1], [x2, y1], [x2, y2]];
      traces.push({ net: net.net, layer, width, points });
      current = next;
    }
  });

  return traces;
}

// ── Net labels — placed at the rightmost pin of each signal net ───────────
function generateNetLabels(circuit) {
  const labels = [];
  const nets = circuit.netlist || [];
  nets.forEach(net => {
    const upper = String(net.net).toUpperCase();
    if (isPowerNet(upper) || isGndNet(upper)) return;
    const pins = (net.pins || []).map(p => schPinAbs(circuit, p)).filter(Boolean);
    if (pins.length === 0) return;
    const rightmost = pins.reduce((a, b) => (a[0] > b[0] ? a : b));
    labels.push({ x: rightmost[0] + 20, y: rightmost[1], text: net.net, side: 'right' });
  });
  return labels;
}

// ── Auto-populate schematic.components from top-level components ──────────
// Map BOM "type" strings → schematic symbol types. Catches AI calling a
// resistor "Resistor" or a DIP-8 IC "IC".
function inferSchType(comp) {
  const t = String(comp.type || '').toLowerCase();
  const pkg = String(comp.package || '').toLowerCase();
  const val = String(comp.value || '').toLowerCase();
  if (t.includes('resist')) return 'resistor';
  if (t.includes('electro') || (t.includes('cap') && val.match(/\d+\s*[uµ]f/i))) {
    return 'capacitor_pol';
  }
  if (t.includes('cap')) return 'capacitor';
  if (t.includes('induct')) return 'inductor';
  if (t === 'led') return 'led';
  if (t.includes('diode')) return 'diode';
  if (t.includes('npn') || (t === 'transistor' && val.match(/3904|547|2222/))) return 'transistor_npn';
  if (t.includes('pnp') || (t === 'transistor' && val.match(/3906|557/))) return 'transistor_pnp';
  if (t.includes('mosfet')) return 'mosfet_n';
  if (t.includes('op') && t.includes('amp')) return 'op_amp';
  if (t.includes('reg') || t.includes('ldo')) return 'voltage_reg';
  if (t.includes('crystal') || t.includes('xtal')) return 'crystal';
  if (t.includes('battery')) return 'battery';
  if (t.includes('switch')) return 'switch';
  if (t.includes('connector') || t.includes('header') || t.includes('jack')) return 'connector';
  // IC/MCU by package
  if (pkg.includes('dip-8') || pkg === 'dip8') return 'ic_dip8';
  if (pkg.includes('dip-14') || pkg === 'dip14') return 'ic_dip14';
  if (pkg.includes('dip-16') || pkg === 'dip16') return 'ic_dip16';
  if (pkg.includes('soic-8') || pkg === 'soic8') return 'ic_soic8';
  if (t.includes('ic') || t.includes('mcu') || t.includes('555') ||
      pkg.includes('soic') || pkg.includes('dip')) return 'ic_dip8';
  return 'resistor'; // fallback so it still renders
}

function ensureSchematicComponents(circuit) {
  if (!circuit.schematic) circuit.schematic = {};
  const sch = circuit.schematic;
  sch.components = sch.components || [];
  const existingIds = new Set(sch.components.map(c => c.id));

  (circuit.components || []).forEach(bom => {
    if (existingIds.has(bom.id)) return;
    sch.components.push({
      id: bom.id,
      type: inferSchType(bom),
      x: 0, y: 0,
      label: bom.id,
      value: bom.value || '',
      ...(bom.pins ? { pins: bom.pins } : {})
    });
  });

  // Normalize any schematic component whose type isn't in our pin map
  sch.components.forEach(c => {
    if (!SCH_PINS[c.type]) {
      const bom = (circuit.components || []).find(b => b.id === c.id);
      c.type = inferSchType(bom || c);
    }
  });
}

// ── Entrypoint: place + route ─────────────────────────────────────────────
function autoRoute(circuit) {
  if (!circuit) return circuit;

  ensureSchematicComponents(circuit);

  // 1. Place components deterministically
  if (circuit.schematic) placeSchematic(circuit);
  if (circuit.pcb) placePCB(circuit);

  // 2. Route
  if (circuit.schematic) {
    const newWires = routeSchematicWires(circuit);
    if (newWires.length > 0) circuit.schematic.wires = newWires;
    circuit.schematic.net_labels = generateNetLabels(circuit);
  }
  if (circuit.pcb) {
    const newTraces = routePCBTraces(circuit);
    if (newTraces.length > 0) circuit.pcb.traces = newTraces;
  }

  return circuit;
}

module.exports = {
  autoRoute,
  placeSchematic,
  placePCB,
  routeSchematicWires,
  routePCBTraces,
  schPinAbs,
  pcbPadAbs,
  SCH_PINS,
};
