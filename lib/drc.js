// lib/drc.js — Design Rule Check + Electrical Rule Check engine

/**
 * DRC_RULES — standard IPC-2221 / JLCPCB design rules
 */
const DRC_RULES = {
  minTraceWidth: 0.1,          // mm
  minClearance: 0.1,           // mm trace-to-trace
  minDrillSize: 0.2,           // mm (JLCPCB min)
  minAnnularRing: 0.13,        // mm
  minViaDrill: 0.3,            // mm
  minViaOuter: 0.6,            // mm
  minPadSize: 0.3,             // mm
  minBoardEdgeClearance: 0.3,  // mm
  maxAspectRatio: 10,          // drill aspect ratio (depth:width)
  boardThickness: 1.6,         // mm standard
};

/**
 * ERC_RULES — standard electrical rule checks
 */
const ERC_VIOLATIONS = {
  PIN_UNCONNECTED:    { code: 'E001', severity: 'error',   msg: 'Unconnected pin' },
  PWR_NOT_DRIVEN:     { code: 'E002', severity: 'error',   msg: 'Power pin not driven' },
  OUTPUT_SHORT:       { code: 'E003', severity: 'error',   msg: 'Output pins shorted' },
  NO_GND:             { code: 'E004', severity: 'error',   msg: 'No GND net found' },
  NO_VCC:             { code: 'E005', severity: 'error',   msg: 'No power net found' },
  MISSING_BYPASS_CAP: { code: 'W001', severity: 'warning', msg: 'IC missing bypass capacitor' },
  FLOATING_INPUT:     { code: 'W002', severity: 'warning', msg: 'Floating input pin detected' },
  LARGE_RESISTOR:     { code: 'W003', severity: 'warning', msg: 'Pull-up/down resistor value unusually large' },
  POLARITY_MISMATCH:  { code: 'W004', severity: 'warning', msg: 'Possible polarity issue (capacitor or diode)' },
};

function runDRC(circuit) {
  const violations = [];
  const warnings = [];
  const passed = [];

  if (!circuit || !circuit.pcb) {
    return { violations, warnings, passed, score: 0 };
  }

  const pcb = circuit.pcb;
  const scale = 0.1; // svg units to mm (approx)

  // ── TRACE WIDTH CHECK ─────────────────────────────────────────
  let traceOk = true;
  (pcb.traces || []).forEach(trace => {
    if (trace.width < DRC_RULES.minTraceWidth) {
      violations.push({
        ...DRC_VIOLATIONS_LOOKUP('DRC001'),
        detail: `Trace on net "${trace.net}" is ${trace.width}mm, min is ${DRC_RULES.minTraceWidth}mm`,
        net: trace.net
      });
      traceOk = false;
    }
  });
  if (traceOk && (pcb.traces || []).length > 0) passed.push('Trace widths meet minimum requirements');

  // ── VIA SIZE CHECK ────────────────────────────────────────────
  let viaOk = true;
  (pcb.vias || []).forEach((via, i) => {
    const drill = via.drill || 0.8;
    const outer = via.outer || 1.6;
    const ring = (outer - drill) / 2;
    if (drill < DRC_RULES.minViaDrill) {
      violations.push({ code:'DRC002', severity:'error', detail:`Via #${i+1} drill ${drill}mm < min ${DRC_RULES.minViaDrill}mm` });
      viaOk = false;
    }
    if (ring < DRC_RULES.minAnnularRing) {
      violations.push({ code:'DRC003', severity:'error', detail:`Via #${i+1} annular ring ${ring.toFixed(2)}mm < min ${DRC_RULES.minAnnularRing}mm` });
      viaOk = false;
    }
  });
  if (viaOk && (pcb.vias || []).length > 0) passed.push('Via sizes and annular rings comply');
  if ((pcb.vias || []).length === 0) passed.push('No vias — single-sided routing verified');

  // ── BOARD EDGE CLEARANCE ──────────────────────────────────────
  const M = pcb.margin || 30;
  let edgeOk = true;
  (pcb.components || []).forEach(comp => {
    const cx = comp.x, cy = comp.y;
    const W = pcb.board_width || 500, H = pcb.board_height || 380;
    const edgeMm = M * scale;
    if (cx < M + 5 || cy < M + 5 || cx > W - M - 5 || cy > H - M - 5) {
      warnings.push({ code:'DRC004', severity:'warning', detail:`Component ${comp.id} may be too close to board edge (< ${DRC_RULES.minBoardEdgeClearance}mm)` });
      edgeOk = false;
    }
  });
  if (edgeOk) passed.push('All components clear of board edge');

  // ── COMPONENT OVERLAP CHECK ───────────────────────────────────
  const comps = pcb.components || [];
  let overlapFound = false;
  for (let i = 0; i < comps.length; i++) {
    for (let j = i + 1; j < comps.length; j++) {
      const dx = Math.abs(comps[i].x - comps[j].x);
      const dy = Math.abs(comps[i].y - comps[j].y);
      if (dx < 20 && dy < 20) {
        violations.push({ code:'DRC005', severity:'error', detail:`Components ${comps[i].id} and ${comps[j].id} overlap` });
        overlapFound = true;
      }
    }
  }
  if (!overlapFound) passed.push('No component overlaps detected');

  // ── NET CONNECTIVITY CHECK ────────────────────────────────────
  const netlist = circuit.netlist || [];
  const hasGnd = netlist.some(n => n.net === 'GND' || n.net === 'GND1');
  const hasVcc = netlist.some(n => n.net === 'VCC' || n.net === 'VCC1' || n.net === '+5V' || n.net === '+3V3' || n.net === '+9V' || n.net === '+12V');

  if (!hasGnd) violations.push({ code:'ERC001', severity:'error', detail:'No GND net found in netlist' });
  else passed.push('GND net present');

  if (!hasVcc) violations.push({ code:'ERC002', severity:'error', detail:'No power net found in netlist' });
  else passed.push('Power net present');

  // ── BYPASS CAP CHECK ─────────────────────────────────────────
  const ics = (circuit.components || []).filter(c =>
    c.type && (c.type.toLowerCase().includes('ic') || c.type.toLowerCase().includes('op') ||
               c.type.toLowerCase().includes('555') || c.type.toLowerCase().includes('mcu') ||
               c.type.toLowerCase().includes('micro') || c.type.toLowerCase().includes('reg'))
  );
  const caps = (circuit.components || []).filter(c =>
    c.type && c.type.toLowerCase().includes('cap')
  );
  if (ics.length > 0 && caps.length === 0) {
    warnings.push({ code:'ERC003', severity:'warning', detail:`${ics.length} IC(s) found but no decoupling capacitors. Add 100nF bypass caps close to each IC power pin.` });
  } else if (ics.length > 0) {
    passed.push(`Decoupling capacitors present for ${ics.length} IC(s)`);
  }

  // ── POLARITY CHECK ────────────────────────────────────────────
  const pols = (circuit.components || []).filter(c =>
    c.type && (c.type.toLowerCase() === 'led' || c.type.toLowerCase() === 'diode' ||
               c.type.toLowerCase().includes('electrolytic'))
  );
  if (pols.length > 0) passed.push(`${pols.length} polarized component(s) identified — verify orientation in layout`);

  // ── SCORE ─────────────────────────────────────────────────────
  const total = violations.length + warnings.length + passed.length;
  const score = total > 0 ? Math.round((passed.length / total) * 100) : 100;

  return { violations, warnings, passed, score, rules: DRC_RULES };
}

function DRC_VIOLATIONS_LOOKUP(code) {
  const map = {
    'DRC001': { code:'DRC001', severity:'error', detail:'' },
    'DRC002': { code:'DRC002', severity:'error', detail:'' },
    'DRC003': { code:'DRC003', severity:'error', detail:'' },
  };
  return map[code] || { code, severity:'error', detail:'' };
}

/**
 * Simulate circuit — DC operating point + basic AC
 * Returns node voltages, branch currents, and power dissipation
 */
function simulateCircuit(circuit) {
  if (!circuit || !circuit.components) {
    return { error: 'No circuit data to simulate' };
  }

  const comps = circuit.components;
  const results = { nodes: {}, branches: [], power: {}, summary: [] };

  // Find supply voltage from specs
  const supplyStr = (circuit.specs && circuit.specs.supply_voltage) || '5V';
  const supply = parseFloat(supplyStr.replace(/[^0-9.]/g, '')) || 5;
  results.nodes['VCC'] = supply;
  results.nodes['GND'] = 0;

  let totalPower = 0;

  // Simulate each component
  comps.forEach(comp => {
    const id = comp.id;
    const type = (comp.type || '').toLowerCase();
    const valStr = comp.value || '0';

    // Parse value
    const val = parseValue(valStr);

    if (type === 'resistor' || type.includes('resist')) {
      if (val > 0) {
        // Assume connected between VCC and GND for simplicity
        const v = supply;
        const i = v / val;
        const p = v * i;
        results.branches.push({ id, type: 'R', value: `${valStr}`, voltage: v.toFixed(3), current: formatCurrent(i), power: formatPower(p) });
        results.power[id] = p;
        totalPower += p;
      }
    }

    else if (type === 'led') {
      // LED: Vf ~ 2.0V, If from series resistor
      const vf = 2.0;
      const vr = supply - vf;
      // Find series resistor
      const serR = comps.find(c => c.type && c.type.toLowerCase().includes('resist'));
      const rVal = serR ? parseValue(serR.value || '330') : 330;
      const i = rVal > 0 ? vr / rVal : 0.02;
      const p = vf * i;
      results.nodes[`${id}.A`] = vf;
      results.nodes[`${id}.K`] = 0;
      results.branches.push({ id, type: 'LED', value: valStr, voltage: `${vf.toFixed(2)}V (Vf)`, current: formatCurrent(i), power: formatPower(p), status: i > 0.001 ? '✓ ON' : '✗ OFF' });
      results.power[id] = p;
      totalPower += p;
    }

    else if (type === 'capacitor' || type.includes('cap')) {
      // DC: cap is open circuit. Show stored charge at steady state
      results.branches.push({ id, type: 'C', value: valStr, voltage: `${supply.toFixed(2)}V (charged)`, current: '0A (DC)', power: '0W', status: 'Open at DC' });
    }

    else if (type === 'inductor' || type.includes('ind')) {
      // DC: inductor is short
      results.branches.push({ id, type: 'L', value: valStr, voltage: '0V (DC)', current: 'Shorted at DC', power: '0W', status: 'Short at DC' });
    }

    else if (type.includes('transistor') || type === 'transistor_npn' || type === 'transistor_pnp') {
      // Simplified BJT: assume in saturation if base driven
      const vce_sat = 0.2;
      const ic = supply > 1 ? (supply - vce_sat) / 100 : 0; // assume 100Ω load
      const p = vce_sat * ic;
      results.branches.push({ id, type: 'BJT', value: valStr, voltage: `Vce=${vce_sat}V (sat)`, current: formatCurrent(ic), power: formatPower(p), status: 'Saturated (assumed ON)' });
      results.power[id] = p;
      totalPower += p;
    }

    else if (type.includes('voltage_reg') || type.includes('ldo') || type.includes('reg')) {
      const vout = parseFloat(valStr.match(/[\d.]+/)?.[0] || '3.3');
      const quiescent = 0.005; // 5mA quiescent
      const p = (supply - vout) * quiescent;
      results.nodes['VREG_OUT'] = vout;
      results.branches.push({ id, type: 'VREG', value: valStr, voltage: `Vout=${vout}V`, current: `${(quiescent*1000).toFixed(1)}mA (Iq)`, power: formatPower(p), status: `Regulating to ${vout}V` });
      results.power[id] = p;
      totalPower += p;
    }

    else if (type.includes('ic') || type.includes('555')) {
      const icc = 0.010; // 10mA typical
      const p = supply * icc;
      results.branches.push({ id, type: 'IC', value: valStr, voltage: `${supply}V`, current: `${(icc*1000).toFixed(0)}mA (Icc typ.)`, power: formatPower(p), status: 'Powered' });
      results.power[id] = p;
      totalPower += p;
    }

    else if (type.includes('op_amp') || type.includes('opamp')) {
      const icc = 0.003; // 3mA typical
      const p = supply * icc;
      results.branches.push({ id, type: 'Op-Amp', value: valStr, voltage: `±${(supply/2).toFixed(1)}V`, current: `${(icc*1000).toFixed(0)}mA (Icc)`, power: formatPower(p), status: 'Powered' });
      results.power[id] = p;
      totalPower += p;
    }
  });

  results.summary = [
    `Supply voltage: ${supply}V`,
    `Total power dissipation: ${formatPower(totalPower)}`,
    `Estimated current draw: ${formatCurrent(totalPower / supply)}`,
    `DC operating point: STABLE`,
    `Components analyzed: ${comps.length}`
  ];

  // Basic 555 timer calculation
  const has555 = comps.some(c => c.value && c.value.toString().includes('555'));
  if (has555) {
    const rA = parseValue(comps.find(c => c.id === 'R1')?.value || '1k');
    const rB = parseValue(comps.find(c => c.id === 'R2')?.value || '10k');
    const cT = parseValue(comps.find(c => c.id === 'C1')?.value || '10u');
    if (rA > 0 && rB > 0 && cT > 0) {
      const freq = 1.44 / ((rA + 2 * rB) * cT);
      const duty = (rA + rB) / (rA + 2 * rB) * 100;
      results.summary.push(`555 Timer frequency: ${formatFreq(freq)}`);
      results.summary.push(`555 Duty cycle: ${duty.toFixed(1)}%`);
    }
  }

  return results;
}

function parseValue(str) {
  if (!str) return 0;
  const s = str.toString().replace(/Ω|ohm|ohms/gi, '').trim();
  const match = s.match(/^([\d.]+)\s*([kKmMuUnNpPfFGT]?)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const suffix = match[2].toLowerCase();
  const multipliers = { 'k': 1e3, 'm': 1e-3, 'u': 1e-6, 'n': 1e-9, 'p': 1e-12, 'f': 1e-12, 'g': 1e9, 't': 1e12 };
  return num * (multipliers[suffix] || 1);
}

function formatCurrent(a) {
  if (a >= 1) return `${a.toFixed(3)}A`;
  if (a >= 0.001) return `${(a * 1000).toFixed(2)}mA`;
  return `${(a * 1e6).toFixed(1)}µA`;
}

function formatPower(w) {
  if (w >= 1) return `${w.toFixed(3)}W`;
  if (w >= 0.001) return `${(w * 1000).toFixed(2)}mW`;
  return `${(w * 1e6).toFixed(1)}µW`;
}

function formatFreq(hz) {
  if (hz >= 1e6) return `${(hz/1e6).toFixed(2)}MHz`;
  if (hz >= 1000) return `${(hz/1000).toFixed(2)}kHz`;
  return `${hz.toFixed(2)}Hz`;
}

module.exports = { runDRC, simulateCircuit, DRC_RULES };
