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
    // 555 timer pinout: 1=GND, 2=TRIG, 3=OUT, 4=RESET, 5=CV, 6=THRES, 7=DIS, 8=VCC
    default: { 1: [-35, -24], 2: [-35, -8], 3: [-35, 8], 4: [-35, 24],
               5: [35, 24], 6: [35, 8], 7: [35, -8], 8: [35, -24],
               GND: [-35, -24], VCC: [35, -24], TRIG: [-35, -8], OUT: [-35, 8],
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
  // connector entries are computed lazily based on comp.pins via schPinAbs
  connector: { default: {} },
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

function connectorPins(count) {
  const m = {};
  for (let i = 1; i <= count; i++) m[i] = [-26, (i - 1) * 14 - ((count - 1) * 14) / 2];
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
  if (comp.type === 'connector') {
    const pins = Math.max(2, comp.pins || 2);
    return [35, Math.max(24, Math.ceil((pins - 1) * 7 + 14))];
  }
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

// ── Pin-name normalisation ────────────────────────────────────────────────
// LLMs often emit long names ("TRIGGER", "THRESHOLD", "OUTPUT", "POSITIVE")
// that don't match our short canonical keys ("TRIG", "THRES", "OUT", "+").
// This map is consulted by BOTH schPinAbs and pcbPadAbs so the canonical
// form can find an offset/pad even when the AI uses a verbose label.
const PIN_SYNONYMS = {
  // 555 timer
  TRIGGER: 'TRIG', TRG: 'TRIG',
  THRESHOLD: 'THRES', THRESH: 'THRES', THR: 'THRES',
  OUTPUT: 'OUT', O: 'OUT',
  DISCHARGE: 'DIS', DSCH: 'DIS', DISCH: 'DIS',
  CONTROL: 'CV', CTRL: 'CV', CONTROLVOLTAGE: 'CV', 'CONTROL_VOLTAGE': 'CV',
  RST: 'RESET', RES: 'RESET',
  // power
  VDD: 'VCC', V_CC: 'VCC', V_DD: 'VCC', POWER: 'VCC', POS: 'VCC', POSITIVE: 'VCC',
  V: 'VCC', SUPPLY: 'VCC',
  VSS: 'GND', V_GND: 'GND', GROUND: 'GND', GRD: 'GND', NEG: 'GND', NEGATIVE: 'GND',
  RTN: 'GND', RETURN: 'GND', '0V': 'GND',
  // diode / LED
  ANODE: 'A', POSITIVE_TERMINAL: 'A', PLUS: '+',
  CATHODE: 'K', NEGATIVE_TERMINAL: '-', MINUS: '-',
  // BJT
  BASE: 'B', COLLECTOR: 'C', EMITTER: 'E',
  // MOSFET
  GATE: 'G', DRAIN: 'D', SOURCE: 'S',
  // op-amp
  'IN+': '+', 'IN-': '-', NONINV: '+', INV: '-',
  'V+': 'VCC', 'V-': 'GND',
  // regulator
  INPUT: 'IN', VINPUT: 'VIN', VINP: 'VIN',
  VOUTPUT: 'VOUT', VOUTP: 'VOUT',
};
function normalizePinName(name) {
  if (name == null) return '';
  const raw = String(name).trim();
  if (!raw) return '';
  const upper = raw.toUpperCase().replace(/\s+/g, '_');
  return PIN_SYNONYMS[upper] || PIN_SYNONYMS[upper.replace(/_/g, '')] || raw;
}

// ── Absolute pin coordinates on the schematic ─────────────────────────────
function schPinAbs(circuit, pinRef) {
  if (!circuit.schematic) return null;
  const [compId, pinNameRaw] = String(pinRef).split('.');
  const comp = (circuit.schematic.components || []).find(c =>
    c.id === compId || c.label === compId);
  if (!comp) return null;
  const pinName = pinNameRaw || '';
  const norm = normalizePinName(pinName);
  let offset = null;
  if (comp.type === 'connector') {
    const pinCount = Math.max(2, comp.pins || 2);
    const map = connectorPins(pinCount);
    offset = map[pinName] || map[norm] || map[parseInt(pinName, 10)];
  } else {
    const typeMap = SCH_PINS[comp.type] || {};
    const orientMap = typeMap[comp.orient] || typeMap.default ||
                      typeMap.horizontal || typeMap.vertical || {};
    offset = orientMap[pinName] ||
             orientMap[String(pinName).toUpperCase()] ||
             orientMap[norm] ||
             orientMap[String(norm).toUpperCase()];
  }
  if (!offset) return null;
  return [comp.x + offset[0], comp.y + offset[1], comp.id];
}

// ── Absolute pad coordinates on the PCB ───────────────────────────────────
function pcbPadAbs(circuit, pinRef) {
  if (!circuit.pcb) return null;
  const [compId, pinNameRaw] = String(pinRef).split('.');
  const comp = (circuit.pcb.components || []).find(c => c.id === compId);
  if (!comp) return null;
  const pads = comp.pads || [];
  const pinName = pinNameRaw || '';
  const norm = normalizePinName(pinName);
  // Try direct match first (numeric or string) on both raw and normalised
  let pad = pads.find(p => String(p.num) === String(pinName)) ||
            pads.find(p => String(p.num) === String(norm));
  if (!pad) {
    // Map well-known pin functions to numeric pad numbers as fallback
    const aliases = {
      VCC: [8, 14, 16], GND: [1, 4, 7, 8],
      TRIG: [2], OUT: [3], RESET: [4], CV: [5], THRES: [6], DIS: [7],
      IN: [1], VIN: [1], VOUT: [3],
      A: [1], K: [2], '+': [1], '-': [2],
      B: [1], C: [2], E: [3], G: [1], D: [2], S: [3]
    };
    const candidates = aliases[String(norm).toUpperCase()] ||
                       aliases[String(pinName).toUpperCase()] || [];
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

  // Grid parameters — sized so trunks fit in the channel between rows
  // without grazing component bodies.
  //   Tallest standard body: ic_dip16 hh=70  → row pitch needs ≥ 2*70 + 60 = 200
  //   Tallest dynamic body: connector w/ many pins → handled by tall-row pass below
  const COL_W = 200;
  const ROW_H = 200;
  const MARGIN_X = 160;
  const MARGIN_Y = 160;

  // Choose columns so the layout is roughly square
  const COLS = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(order.length * 0.9))));

  // Split components: "compact" (fit in standard row) vs "tall" (own row).
  // Threshold: half-height > 80 means component would eat its row's wire channel.
  const TALL_HH = 80;
  const compactIds = [];
  const tallIds = [];
  for (const id of order) {
    const c = comps.find(cc => cc.id === id);
    if (!c) continue;
    const hh = schBBox(c)[1];
    if (hh > TALL_HH) tallIds.push(id);
    else compactIds.push(id);
  }

  // Hub-centered placement.  Physics motivation: the highest-degree node (the
  // IC, op-amp, MCU, regulator) connects to many neighbours.  Placing it in
  // the geometric centre of the grid means neighbours can sit on every side
  // (N/S/E/W) of the hub and reach it via short orthogonal wires.  In a
  // corner-rooted BFS layout, every neighbour has to enter from one side and
  // wires pile up — exactly the failure mode in the user's last screenshot.
  // We pre-compute grid cells sorted by Manhattan distance from centre and
  // hand them out in BFS order, so the hub gets centre and its neighbours
  // get adjacent cells.
  const compactRows = Math.max(1, Math.ceil(compactIds.length / COLS));
  const centerCol = Math.floor((COLS - 1) / 2);
  const centerRow = Math.floor((compactRows - 1) / 2);
  const cells = [];
  for (let r = 0; r < compactRows; r++) {
    for (let c = 0; c < COLS; c++) {
      // Manhattan distance from centre, with a tiny tiebreak so cells on the
      // SAME ROW as the hub are preferred over diagonals (keeps left/right
      // exit pins on the IC paired with neighbours on the same row).
      const d = Math.abs(c - centerCol) + Math.abs(r - centerRow) +
                Math.abs(r - centerRow) * 0.01;
      cells.push({ col: c, row: r, d });
    }
  }
  cells.sort((a, b) => a.d - b.d);

  compactIds.forEach((id, i) => {
    const comp = comps.find(c => c.id === id);
    if (!comp) return;
    const cell = cells[Math.min(i, cells.length - 1)];
    comp.x = MARGIN_X + cell.col * COL_W;
    comp.y = MARGIN_Y + cell.row * ROW_H;
  });

  // Place tall components in their own dedicated rows below the grid.
  // Each tall component takes a full row sized to its height.
  let tallY = MARGIN_Y + compactRows * ROW_H;
  tallIds.forEach((id, idx) => {
    const comp = comps.find(c => c.id === id);
    if (!comp) return;
    const hh = schBBox(comp)[1];
    tallY += Math.max(80, hh + 40);     // top padding before this tall row
    // Place on the right side of the canvas so it can hook into the right edge
    comp.x = MARGIN_X + (COLS - 1) * COL_W;
    comp.y = tallY;
    tallY += hh + 40;                    // bottom padding
  });

  sch.width  = MARGIN_X * 2 + (COLS - 1) * COL_W + 240;   // 240px right gutter for labels
  sch.height = (tallIds.length > 0 ? tallY : MARGIN_Y + (compactRows - 1) * ROW_H) + 160;

  // Power rails — VCC at very top, GND at very bottom
  const centerX = sch.width / 2;
  sch.power_rails = [
    { type: 'vcc', x: centerX, y: 70,                label: 'VCC' },
    { type: 'gnd', x: centerX, y: sch.height - 70,   label: 'GND' },
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

  // Build a "must-be-near-IC" map for decoupling caps.  A cap on the same VCC
  // net as an IC needs to sit RIGHT NEXT to that IC's VCC pin — physics: every
  // mm of trace between cap and IC pin adds ~1nH; on a sharp di/dt that
  // becomes a supply-rail glitch ΔV = L·di/dt that can mis-clock the chip.
  const decoupleParent = new Map();   // capId → icId
  const nets = circuit.netlist || [];
  const compsById = new Map(comps.map(c => [c.id, c]));
  const isIcType = (t) => {
    if (!t) return false;
    const tt = t.toLowerCase();
    return tt.includes('ic_') || tt === 'op_amp' || tt === 'voltage_reg' ||
           tt.includes('mcu') || tt.includes('soic') || tt.includes('dip');
  };
  const isCapType = (t) => /^(capacitor|capacitor_pol|electrolytic)$/i.test(t || '');
  nets.forEach(n => {
    const upper = String(n.net || '').toUpperCase();
    if (!isPowerNet(upper)) return;
    const onNet = (n.pins || []).map(p => String(p).split('.')[0]);
    const ics = onNet.filter(id => {
      const c = compsById.get(id); return c && isIcType(c.type);
    });
    const caps = onNet.filter(id => {
      const c = compsById.get(id); return c && isCapType(c.type);
    });
    // Pair each cap with the closest IC by index (greedy, deterministic)
    caps.forEach((capId, i) => {
      if (ics[i]) decoupleParent.set(capId, ics[i]);
      else if (ics.length) decoupleParent.set(capId, ics[0]);
    });
  });

  // Sort by area desc (largest first = better packing) — but pull every cap
  // marked as decoupling immediately after its IC parent so they get adjacent
  // positions on the same shelf row.
  items.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  const itemById = new Map(items.map(it => [it.comp.id, it]));
  const reordered = [];
  const placedIds = new Set();
  for (const it of items) {
    if (placedIds.has(it.comp.id)) continue;
    reordered.push(it);
    placedIds.add(it.comp.id);
    // If this is an IC, immediately follow it with its decoupling caps
    if (isIcType(it.comp.type)) {
      for (const [capId, parent] of decoupleParent) {
        if (parent === it.comp.id && !placedIds.has(capId) && itemById.get(capId)) {
          reordered.push(itemById.get(capId));
          placedIds.add(capId);
        }
      }
    }
  }
  items.length = 0;
  items.push(...reordered);

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
// Strategy:
//   1. Treat horizontal CHANNELS between rows of components as the only legal
//      Y-positions for trunks. Trunk passing through a row would slice the
//      bodies — so trunks are forbidden anywhere a body sits.
//   2. For each pin, drop a vertical wire from pin → trunk Y. If that vertical
//      slices any other body, mark the pin as "unreachable" and connect via a
//      net LABEL instead (KiCAD-standard practice for crowded nets).
//   3. Power/GND get dedicated rails at the top/bottom of the canvas.
//   4. Multiple nets sharing a channel are spread by ±14px offsets so trunks
//      never overlap each other.
//
// Returns an object with `wires` and `labels` so the caller can update both.
function routeSchematicWires(circuit) {
  const wires = [];
  const labels = [];
  const sch = circuit.schematic || {};
  const comps = sch.components || [];
  const nets = circuit.netlist || [];

  const vccY = 70;
  const gndY = (sch.height || 700) - 70;

  // ── Body bounding boxes for collision tests (slight padding) ───────────
  const PAD = 4;
  const bodies = comps.map(c => {
    const [hw, hh] = schBBox(c);
    return {
      id: c.id,
      x1: c.x - hw - PAD, x2: c.x + hw + PAD,
      y1: c.y - hh - PAD, y2: c.y + hh + PAD,
    };
  });
  function vertHitsBody(x, y1, y2, excludeId) {
    const sy = Math.min(y1, y2), ey = Math.max(y1, y2);
    for (const b of bodies) {
      if (excludeId && b.id === excludeId) continue;
      if (x > b.x1 && x < b.x2 && ey > b.y1 && sy < b.y2) return true;
    }
    return false;
  }
  function horizHitsBody(y, x1, x2, excludeId) {
    const sx = Math.min(x1, x2), ex = Math.max(x1, x2);
    for (const b of bodies) {
      if (excludeId && b.id === excludeId) continue;
      if (y > b.y1 && y < b.y2 && ex > b.x1 && sx < b.x2) return true;
    }
    return false;
  }

  // ── Pin exit direction (which side of the body the pin sticks out) ─────
  function pinExit(compId, px, py) {
    const c = comps.find(cc => cc.id === compId);
    if (!c) return { dirX: 1, dirY: 0 };
    const dx = px - c.x, dy = py - c.y;
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0) {
      return { dirX: dx > 0 ? 1 : -1, dirY: 0 };
    }
    if (Math.abs(dy) > 0) return { dirX: 0, dirY: dy > 0 ? 1 : -1 };
    return { dirX: 1, dirY: 0 };
  }

  // ── Compute legal channel Ys (between rows) ────────────────────────────
  const rowYs = [...new Set(comps.map(c => c.y))].sort((a, b) => a - b);
  const yChans = [];
  for (let i = 0; i < rowYs.length - 1; i++) {
    yChans.push(Math.round((rowYs[i] + rowYs[i + 1]) / 2 / 10) * 10);
  }
  if (rowYs.length) {
    yChans.unshift(Math.max(vccY + 30, rowYs[0] - 60));
    yChans.push(Math.min(gndY - 30, rowYs[rowYs.length - 1] + 60));
  }
  const channelYs = [...new Set(yChans)].sort((a, b) => a - b);

  // ── Compute legal channel Xs (between columns) ────────────────────────
  const colXs = [...new Set(comps.map(c => c.x))].sort((a, b) => a - b);
  const xChans = [];
  for (let i = 0; i < colXs.length - 1; i++) {
    xChans.push(Math.round((colXs[i] + colXs[i + 1]) / 2 / 10) * 10);
  }
  if (colXs.length) {
    xChans.unshift(colXs[0] - 90);
    xChans.push(colXs[colXs.length - 1] + 90);
  }
  const channelXs = [...new Set(xChans)].sort((a, b) => a - b);

  // Per-channel offset trackers — different nets get unique offsets
  const channelYUse = new Map();
  const channelXUse = new Map();
  const offsetSeq = (k) => (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 12;

  function allocTrunkY(preferredCh, trunkMinX, trunkMaxX) {
    const ordered = [...channelYs].sort((a, b) =>
      Math.abs(a - preferredCh) - Math.abs(b - preferredCh));
    for (const ch of ordered) {
      const startK = channelYUse.get(ch) || 0;
      for (let k = startK; k <= startK + 12; k++) {
        const cand = ch + offsetSeq(k);
        if (!horizHitsBody(cand, trunkMinX, trunkMaxX)) {
          channelYUse.set(ch, k + 1);
          return cand;
        }
      }
    }
    return preferredCh;
  }

  // Pick a column channel near (escX, escY) on the exit side of the pin.
  function pickChannelX(escX, escY, exit, trunkY, compId) {
    // Candidate channels filtered by exit direction
    let cands;
    if (exit.dirX > 0) {
      cands = channelXs.filter(x => x >= escX);
    } else if (exit.dirX < 0) {
      cands = channelXs.filter(x => x <= escX);
    } else {
      cands = [...channelXs];
    }
    if (!cands.length) cands = [...channelXs];
    // Prefer closest
    cands.sort((a, b) => Math.abs(a - escX) - Math.abs(b - escX));

    for (const cx of cands) {
      const startK = channelXUse.get(cx) || 0;
      for (let k = startK; k <= startK + 12; k++) {
        const cand = cx + offsetSeq(k);
        // Check (1) horizontal segment escY..cand at escY doesn't hit bodies
        //   and (2) vertical segment from escY to trunkY at cand doesn't hit bodies
        if (!horizHitsBody(escY, escX, cand, compId) &&
            !vertHitsBody(cand, escY, trunkY, compId)) {
          channelXUse.set(cx, k + 1);
          return cand;
        }
      }
    }
    return null;
  }

  // Power-rail anchors
  const powerAnchors = {};
  (sch.power_rails || []).forEach(r => {
    const net = (r.label || (r.type === 'gnd' ? 'GND' : 'VCC')).toUpperCase();
    if (!powerAnchors[net]) powerAnchors[net] = [];
    powerAnchors[net].push([r.x, r.y]);
  });

  // Place a net label at the pin's exit direction (away from the body)
  function makeLabel(pinX, pinY, compId, text) {
    const c = comps.find(cc => cc.id === compId);
    if (!c) return { x: pinX + 8, y: pinY, text, side: 'right' };
    const dx = pinX - c.x, dy = pinY - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0
        ? { x: pinX + 8, y: pinY,         text, side: 'right' }
        : { x: pinX - 8, y: pinY,         text, side: 'left'  };
    }
    return dy >= 0
      ? { x: pinX,     y: pinY + 12, text, side: 'right' }
      : { x: pinX,     y: pinY - 10, text, side: 'right' };
  }

  // Route a pin to the trunk:
  //   1. Try a straight vertical drop (the cleanest path)
  //   2. Else: escape outward in pin's exit direction, then jog to a column
  //      channel, then drop along the column to trunkY.
  // Returns the X at which the trunk should connect (or null on failure).
  function routePinToTrunk(px, py, compId, trunkY) {
    const exit = pinExit(compId, px, py);

    // (1) Straight drop
    if (!vertHitsBody(px, py, trunkY, compId)) {
      wires.push({ x1: px, y1: py, x2: px, y2: trunkY });
      return px;
    }

    // (2) Escape + channel
    const ESCAPE = 14;
    let escX = px, escY = py;
    if (exit.dirY !== 0) {
      escY = py + exit.dirY * ESCAPE;
      // The escape segment itself shouldn't be blocked — it's a tiny stub
      wires.push({ x1: px, y1: py, x2: px, y2: escY });
    } else {
      escX = px + exit.dirX * ESCAPE;
      wires.push({ x1: px, y1: py, x2: escX, y2: py });
    }

    const channelX = pickChannelX(escX, escY, exit, trunkY, compId);
    if (channelX === null) {
      // Pop the escape stub we just added — caller will use a label instead
      wires.pop();
      return null;
    }

    if (channelX !== escX) {
      wires.push({ x1: escX, y1: escY, x2: channelX, y2: escY });
    }
    if (escY !== trunkY) {
      wires.push({ x1: channelX, y1: escY, x2: channelX, y2: trunkY });
    }
    return channelX;
  }

  // Route nets in priority order: power/gnd first (they get the cleanest channels),
  // then signal nets ordered by pin count descending (busy nets first).
  const orderedNets = [...nets].sort((a, b) => {
    const aPwr = isGndNet((a.net || '').toUpperCase()) || isPowerNet((a.net || '').toUpperCase());
    const bPwr = isGndNet((b.net || '').toUpperCase()) || isPowerNet((b.net || '').toUpperCase());
    if (aPwr !== bPwr) return aPwr ? -1 : 1;
    return (b.pins || []).length - (a.pins || []).length;
  });

  orderedNets.forEach(net => {
    const upper = String(net.net || '').toUpperCase();
    const pinsAll = (net.pins || []).map(p => schPinAbs(circuit, p)).filter(Boolean);
    if (pinsAll.length === 0) return;
    const isGnd = isGndNet(upper);
    const isPwr = isPowerNet(upper);

    if (isGnd || isPwr) {
      const railY = isGnd ? gndY : vccY;
      const reachable = [];
      pinsAll.forEach(([x, y, compId]) => {
        const cx = routePinToTrunk(x, y, compId, railY);
        if (cx !== null) reachable.push(cx);
        else labels.push(makeLabel(x, y, compId, upper));
      });
      const anchors = powerAnchors[upper] ||
                      (isGnd ? powerAnchors.GND : powerAnchors.VCC) || [];
      if (anchors.length && reachable.length) {
        const cx = (Math.min(...reachable) + Math.max(...reachable)) / 2;
        const a = anchors.reduce((best, p) =>
          Math.abs(p[0] - cx) < Math.abs(best[0] - cx) ? p : best);
        if (a[1] !== railY) wires.push({ x1: a[0], y1: a[1], x2: a[0], y2: railY });
        const lo = Math.min(a[0], ...reachable);
        const hi = Math.max(a[0], ...reachable);
        if (lo !== hi) wires.push({ x1: lo, y1: railY, x2: hi, y2: railY });
      } else if (reachable.length > 1) {
        wires.push({
          x1: Math.min(...reachable), y1: railY,
          x2: Math.max(...reachable), y2: railY,
        });
      }
      return;
    }

    // ── Signal net ─────────────────────────────────────────────────────
    if (pinsAll.length < 2) {
      const [x, y, compId] = pinsAll[0];
      labels.push(makeLabel(x, y, compId, net.net));
      return;
    }

    const xs = pinsAll.map(p => p[0]);
    const ys = pinsAll.map(p => p[1]);
    const trunkMinX = Math.min(...xs) - 30, trunkMaxX = Math.max(...xs) + 30;
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const trunkY = allocTrunkY(centerY, trunkMinX, trunkMaxX);

    const reachableXs = [];
    pinsAll.forEach(([x, y, compId]) => {
      const cx = routePinToTrunk(x, y, compId, trunkY);
      if (cx !== null) reachableXs.push(cx);
      else labels.push(makeLabel(x, y, compId, net.net));
    });
    if (reachableXs.length > 1) {
      wires.push({
        x1: Math.min(...reachableXs), y1: trunkY,
        x2: Math.max(...reachableXs), y2: trunkY,
      });
      labels.push({
        x: Math.max(...reachableXs) + 12, y: trunkY,
        text: net.net, side: 'right',
      });
    } else if (reachableXs.length === 1) {
      labels.push({
        x: reachableXs[0] + 12, y: trunkY,
        text: net.net, side: 'right',
      });
    }
  });

  return { wires, labels };
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

// ── Canonical PCB pad layouts ─────────────────────────────────────────────
// SVG-units = mm × ~3.78 here. Pad spacing taken from real datasheets:
//   0805 chip: pads 1.0 × 1.4 mm at ±0.6 mm  → ~14 × 18 SVG units, ±8 SVG
//   0603 chip: pads 0.8 × 1.0 mm at ±0.4 mm  → ~12 × 14, ±6
//   SOIC-8:    1.27 mm pitch, body 4 mm wide → pads at y=±15, x=-19,-7,5,17
//   DIP-8:     2.54 mm pitch, body 7.62 wide → pads at y=±25, x=-19,-7,5,17 + drill
//   TO-220:    2.54 mm pitch lead row        → 3 pads x=-25,0,25 y=0
// All values chosen so the resulting body BBOX is realistic (not a huge box).
function pkgPads(pkg, type) {
  const p = String(pkg || '').toLowerCase();
  if (p.includes('0402')) return [
    { num: 1, x: -8, y: 0, w: 9, h: 10 }, { num: 2, x: 8, y: 0, w: 9, h: 10 } ];
  if (p.includes('0603')) return [
    { num: 1, x: -10, y: 0, w: 11, h: 12 }, { num: 2, x: 10, y: 0, w: 11, h: 12 } ];
  if (p.includes('0805')) return [
    { num: 1, x: -14, y: 0, w: 14, h: 16 }, { num: 2, x: 14, y: 0, w: 14, h: 16 } ];
  if (p.includes('1206')) return [
    { num: 1, x: -18, y: 0, w: 16, h: 18 }, { num: 2, x: 18, y: 0, w: 16, h: 18 } ];
  if (p.includes('soic-8') || p.includes('so-8') || p.includes('soic8')) return [
    { num: 1, x: -19, y: -15, w: 12, h: 6 }, { num: 2, x: -7, y: -15, w: 12, h: 6 },
    { num: 3, x:  5,  y: -15, w: 12, h: 6 }, { num: 4, x: 17, y: -15, w: 12, h: 6 },
    { num: 5, x: 17,  y:  15, w: 12, h: 6 }, { num: 6, x:  5, y:  15, w: 12, h: 6 },
    { num: 7, x: -7,  y:  15, w: 12, h: 6 }, { num: 8, x: -19,y:  15, w: 12, h: 6 } ];
  if (p.includes('dip-8') || p.includes('dip8')) return [
    { num: 1, x: -19, y: -25, w: 12, h: 12, drill: 0.8 }, { num: 2, x: -7, y: -25, w: 12, h: 12, drill: 0.8 },
    { num: 3, x:  5,  y: -25, w: 12, h: 12, drill: 0.8 }, { num: 4, x: 17, y: -25, w: 12, h: 12, drill: 0.8 },
    { num: 5, x: 17,  y:  25, w: 12, h: 12, drill: 0.8 }, { num: 6, x:  5, y:  25, w: 12, h: 12, drill: 0.8 },
    { num: 7, x: -7,  y:  25, w: 12, h: 12, drill: 0.8 }, { num: 8, x: -19,y:  25, w: 12, h: 12, drill: 0.8 } ];
  if (p.includes('soic-14') || p.includes('soic14')) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      out.push({ num: i + 1, x: -36 + i * 12, y: -15, w: 12, h: 6 });
      out.push({ num: 14 - i, x: -36 + i * 12, y:  15, w: 12, h: 6 });
    }
    return out;
  }
  if (p.includes('soic-16') || p.includes('soic16')) {
    const out = [];
    for (let i = 0; i < 8; i++) {
      out.push({ num: i + 1, x: -42 + i * 12, y: -15, w: 12, h: 6 });
      out.push({ num: 16 - i, x: -42 + i * 12, y:  15, w: 12, h: 6 });
    }
    return out;
  }
  if (p.includes('dip-14') || p.includes('dip14')) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      out.push({ num: i + 1, x: -36 + i * 12, y: -30, w: 12, h: 12, drill: 0.8 });
      out.push({ num: 14 - i, x: -36 + i * 12, y:  30, w: 12, h: 12, drill: 0.8 });
    }
    return out;
  }
  if (p.includes('dip-16') || p.includes('dip16')) {
    const out = [];
    for (let i = 0; i < 8; i++) {
      out.push({ num: i + 1, x: -42 + i * 12, y: -30, w: 12, h: 12, drill: 0.8 });
      out.push({ num: 16 - i, x: -42 + i * 12, y:  30, w: 12, h: 12, drill: 0.8 });
    }
    return out;
  }
  if (p.includes('to-220') || p.includes('to220')) return [
    { num: 1, x: -25, y: 0, w: 14, h: 14, drill: 1.0 },
    { num: 2, x:  0,  y: 0, w: 14, h: 14, drill: 1.0 },
    { num: 3, x:  25, y: 0, w: 14, h: 14, drill: 1.0 } ];
  if (p.includes('to-92') || p.includes('to92')) return [
    { num: 1, x: -8, y: 0, w: 10, h: 10, drill: 0.8 },
    { num: 2, x:  0, y: 6, w: 10, h: 10, drill: 0.8 },
    { num: 3, x:  8, y: 0, w: 10, h: 10, drill: 0.8 } ];
  if (p.includes('sot-23') || p.includes('sot23')) return [
    { num: 1, x: -10, y: -7, w: 8, h: 6 },
    { num: 2, x:  10, y: -7, w: 8, h: 6 },
    { num: 3, x:  0,  y:  7, w: 8, h: 6 } ];
  if (p.includes('electrolytic') || p.includes('radial')) return [
    { num: 1, x: -10, y: 0, w: 12, h: 12, drill: 0.8 },
    { num: 2, x:  10, y: 0, w: 12, h: 12, drill: 0.8 } ];
  // SMD LED
  if (p.includes('led') || (type && type.toLowerCase() === 'led')) return [
    { num: 1, x: -8, y: 0, w: 10, h: 10 }, { num: 2, x: 8, y: 0, w: 10, h: 10 } ];
  return null;
}

// Replace any AI-supplied pads with the canonical layout for the package.
// This guarantees the body bbox is realistic (no "giant black square" U1).
function normalizePCBComponents(circuit) {
  if (!circuit.pcb || !circuit.pcb.components) return;
  circuit.pcb.components.forEach(c => {
    const canon = pkgPads(c.package, c.type);
    if (!canon) return;
    // Sanity-check: if the AI's pads are already close to canonical, keep them
    // (preserves user-tweaked layouts).  Else replace.
    const padsOK = Array.isArray(c.pads) && c.pads.length === canon.length &&
      c.pads.every(p =>
        Number.isFinite(p.x) && Number.isFinite(p.y) &&
        Math.abs(p.x) < 80 && Math.abs(p.y) < 80 &&
        (p.w || 0) > 2 && (p.w || 0) < 40);
    if (!padsOK) {
      c.pads = canon.map(p => ({ ...p }));
    }
  });
}

// ── Entrypoint: place + route ─────────────────────────────────────────────
function autoRoute(circuit) {
  if (!circuit) return circuit;

  ensureSchematicComponents(circuit);
  normalizePCBComponents(circuit);

  // 1. Place components deterministically
  if (circuit.schematic) placeSchematic(circuit);
  if (circuit.pcb) placePCB(circuit);

  // 2. Route
  if (circuit.schematic) {
    const { wires, labels } = routeSchematicWires(circuit);
    circuit.schematic.wires = wires;
    circuit.schematic.net_labels = labels;
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
