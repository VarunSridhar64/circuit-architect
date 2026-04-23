// lib/router.js — deterministic wire + PCB trace router
// Takes the AI-generated circuit (components + netlist + positions) and
// produces GUARANTEED-connecting orthogonal wires and PCB traces.
// This replaces whatever wires/traces the model hallucinates.

// ── Schematic pin offsets from component origin ───────────────────────────
// Each entry: [orientation or 'default'][pinName] -> [dx, dy]
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

// ── Power-net detection ───────────────────────────────────────────────────
function isPowerNet(name) {
  if (!name) return false;
  const n = name.toUpperCase();
  return n === 'VCC' || n === 'VDD' || n === 'VEE' || n === 'VSS' ||
         n.startsWith('+') || n.endsWith('V') && /^\+?\d/.test(n.replace(/^\+/, ''));
}
function isGndNet(name) {
  if (!name) return false;
  const n = name.toUpperCase();
  return n === 'GND' || n === 'GND1' || n === 'AGND' || n === 'DGND' || n === 'VSS';
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
  // Try numeric pin number first
  let pad = pads.find(p => String(p.num) === String(pinName));
  if (!pad) {
    // Try by pin name aliases (only meaningful for ICs)
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

// ── Orthogonal L-route between two points ─────────────────────────────────
function lRoute(x1, y1, x2, y2, preferHoriz = true) {
  if (x1 === x2 || y1 === y2) return [[x1, y1], [x2, y2]];
  if (preferHoriz) return [[x1, y1], [x2, y1], [x2, y2]];
  return [[x1, y1], [x1, y2], [x2, y2]];
}

// ── Route schematic wires from netlist ────────────────────────────────────
function routeSchematicWires(circuit) {
  const wires = [];
  const sch = circuit.schematic || {};
  const nets = circuit.netlist || [];

  // Power-rail anchors (from schematic.power_rails)
  const powerAnchors = {};
  (sch.power_rails || []).forEach(r => {
    const net = (r.label || (r.type === 'gnd' ? 'GND' : 'VCC')).toUpperCase();
    if (!powerAnchors[net]) powerAnchors[net] = [];
    powerAnchors[net].push([r.x, r.y]);
  });

  nets.forEach(net => {
    const pins = (net.pins || []).map(p => schPinAbs(circuit, p)).filter(Boolean);
    if (pins.length === 0) return;

    // Anchor power/gnd nets to their power-rail symbols
    const upper = String(net.net).toUpperCase();
    const anchors = powerAnchors[upper] || (isGndNet(upper) ? powerAnchors.GND : null) ||
                    (isPowerNet(upper) ? powerAnchors.VCC : null) || [];
    anchors.forEach(a => pins.push([a[0], a[1], '__rail__']));

    if (pins.length < 2) return;

    // For power/ground: each pin gets an L-route up/down to a horizontal trunk at the rail Y.
    // For signals: use a median trunk so wires spread out nicely.
    const ys = pins.map(p => p[1]);
    const trunkY = Math.round((Math.min(...ys) + Math.max(...ys)) / 2 / 10) * 10;

    pins.forEach(([x, y]) => {
      if (y !== trunkY) wires.push({ x1: x, y1: y, x2: x, y2: trunkY });
    });

    // Trunk from leftmost to rightmost
    const xs = pins.map(p => p[0]).sort((a, b) => a - b);
    if (xs[0] !== xs[xs.length - 1]) {
      wires.push({ x1: xs[0], y1: trunkY, x2: xs[xs.length - 1], y2: trunkY });
    }
  });

  return wires;
}

// ── Route PCB traces from netlist ─────────────────────────────────────────
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

    // Chain pads in spatial order (approximate MST via sort-by-x)
    const sorted = [...pads].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

    for (let i = 0; i < sorted.length - 1; i++) {
      const [x1, y1] = sorted[i];
      const [x2, y2] = sorted[i + 1];
      const midX = Math.round((x1 + x2) / 2);
      // L-shape with one bend
      const points = (x1 === x2 || y1 === y2)
        ? [[x1, y1], [x2, y2]]
        : [[x1, y1], [midX, y1], [midX, y2], [x2, y2]];
      traces.push({ net: net.net, layer, width, points });
    }
  });

  return traces;
}

// ── Net-label generator — places labels at the end of each signal trunk ──
function generateNetLabels(circuit) {
  const labels = [];
  const nets = circuit.netlist || [];
  nets.forEach(net => {
    const upper = String(net.net).toUpperCase();
    if (isPowerNet(upper) || isGndNet(upper)) return; // handled by power rails
    const pins = (net.pins || []).map(p => schPinAbs(circuit, p)).filter(Boolean);
    if (pins.length === 0) return;
    // Place label near rightmost pin
    const rightmost = pins.reduce((a, b) => (a[0] > b[0] ? a : b));
    labels.push({ x: rightmost[0] + 20, y: rightmost[1], text: net.net, side: 'right' });
  });
  return labels;
}

// ── Entrypoint: takes a circuit, returns it with wires/traces replaced ───
function autoRoute(circuit) {
  if (!circuit) return circuit;

  // Schematic
  if (circuit.schematic) {
    const newWires = routeSchematicWires(circuit);
    if (newWires.length > 0) circuit.schematic.wires = newWires;

    // Preserve AI-generated net labels if any, otherwise synthesize
    if (!circuit.schematic.net_labels || circuit.schematic.net_labels.length === 0) {
      circuit.schematic.net_labels = generateNetLabels(circuit);
    }
  }

  // PCB
  if (circuit.pcb) {
    const newTraces = routePCBTraces(circuit);
    if (newTraces.length > 0) circuit.pcb.traces = newTraces;
  }

  return circuit;
}

module.exports = { autoRoute, routeSchematicWires, routePCBTraces, schPinAbs, pcbPadAbs, SCH_PINS };
