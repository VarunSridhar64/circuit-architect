// lib/kicad-export.js — generate KiCad 7/8 .kicad_sch + .kicad_pcb + .kicad_pro,
// plus EAGLE 7 .sch XML (Altium imports EAGLE natively) from our circuit JSON.

const { SCH_PINS } = require('./router');

// ── UUID (KiCad requires UUIDs on nearly every element) ───────────────────
function uuid() {
  const hex = (n) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`;
}

// ── KiCad coordinate transform ────────────────────────────────────────────
// Our SVG uses ~10 units = 1mm. KiCad uses millimeters (with decimals).
// Schematic coordinates: typical KiCad sheet A4 = 297x210mm.
const SCH_SCALE = 0.254; // 1 SVG unit → 0.254mm (≈ 1/100 inch, a common KiCad pitch)
const PCB_SCALE = 0.1;   // 1 SVG unit → 0.1mm (matches our 10u/mm convention)

function schX(v) { return (v * SCH_SCALE).toFixed(3); }
function schY(v) { return (v * SCH_SCALE).toFixed(3); }
function pcbX(v, offset=0) { return (v * PCB_SCALE + offset).toFixed(3); }
function pcbY(v, offset=0) { return (v * PCB_SCALE + offset).toFixed(3); }

// ── Map our component "type" to KiCad library symbol ──────────────────────
const KICAD_SYMBOL = {
  resistor: 'Device:R',
  capacitor: 'Device:C',
  capacitor_pol: 'Device:C_Polarized',
  electrolytic: 'Device:C_Polarized',
  inductor: 'Device:L',
  led: 'Device:LED',
  diode: 'Device:D',
  transistor_npn: 'Transistor_BJT:2N3904',
  transistor_pnp: 'Transistor_BJT:2N3906',
  mosfet_n: 'Transistor_FET:BSS138',
  op_amp: 'Amplifier_Operational:LM358',
  ic_dip8: 'Timer:NE555P',
  ic_soic8: 'Timer:NE555D',
  ic_dip14: 'Logic_LvlTrans:74LVC14A',
  ic_dip16: 'Logic_HC:74HC595',
  voltage_reg: 'Regulator_Linear:LM7805_TO220',
  connector: 'Connector:Conn_01x03_Female',
  crystal: 'Device:Crystal',
  battery: 'Device:Battery_Cell',
  switch: 'Switch:SW_Push',
};

// ── Map our package to KiCad footprint ────────────────────────────────────
const KICAD_FOOTPRINT = {
  '0402': 'Resistor_SMD:R_0402_1005Metric',
  '0603': 'Resistor_SMD:R_0603_1608Metric',
  '0805': 'Resistor_SMD:R_0805_2012Metric',
  '1206': 'Resistor_SMD:R_1206_3216Metric',
  'SOIC-8': 'Package_SO:SOIC-8_3.9x4.9mm_P1.27mm',
  'DIP-8': 'Package_DIP:DIP-8_W7.62mm',
  'DIP-14': 'Package_DIP:DIP-14_W7.62mm',
  'DIP-16': 'Package_DIP:DIP-16_W7.62mm',
  'SOIC-14': 'Package_SO:SOIC-14_3.9x8.7mm_P1.27mm',
  'SOIC-16': 'Package_SO:SOIC-16_3.9x9.9mm_P1.27mm',
  'TO-220': 'Package_TO_SOT_THT:TO-220-3_Vertical',
  'TO-92': 'Package_TO_SOT_THT:TO-92_Inline',
  'SOT-23': 'Package_TO_SOT_SMD:SOT-23',
  'QFP-32': 'Package_QFP:TQFP-32_7x7mm_P0.8mm',
  'electrolytic_radial': 'Capacitor_THT:CP_Radial_D5.0mm_P2.00mm',
  'HC-49': 'Crystal:Crystal_HC49-U_Vertical',
};

// ══════════════════════════════════════════════════════════════════════════
// KICAD .kicad_sch (KiCad 7/8 S-expression format)
// ══════════════════════════════════════════════════════════════════════════
function generateKicadSch(circuit) {
  const sch = circuit.schematic || {};
  const components = sch.components || [];
  const wires = sch.wires || [];
  const labels = sch.net_labels || [];
  const rails = sch.power_rails || [];

  // Offset so all coordinates land inside the 297x210mm A4 sheet
  const offsetX = 25.4, offsetY = 25.4;
  const tx = (v) => (parseFloat(schX(v)) + offsetX).toFixed(3);
  const ty = (v) => (parseFloat(schY(v)) + offsetY).toFixed(3);

  let out = `(kicad_sch (version 20230121) (generator circuit_architect_pro)
  (uuid ${uuid()})
  (paper "A4")
  (title_block
    (title "${escapeStr(circuit.name || 'Circuit Architect Design')}")
    (date "${new Date().toISOString().slice(0, 10)}")
    (rev "A")
    (company "Circuit Architect Pro")
  )
`;

  // lib_symbols: minimal symbol definitions pointing at KiCad Device library.
  // In KiCad 7+ the user needs these libs installed; if not, they fall back
  // gracefully and show the reference + value anyway.
  const usedSymbols = new Set();
  components.forEach(c => { const lib = KICAD_SYMBOL[c.type]; if (lib) usedSymbols.add(lib); });

  out += `  (lib_symbols\n`;
  usedSymbols.forEach(libId => {
    const [, name] = libId.split(':');
    out += `    (symbol "${libId}" (pin_numbers hide) (pin_names (offset 0) hide) (in_bom yes) (on_board yes)
      (property "Reference" "${refPrefix(libId)}" (at 0 0 0) (effects (font (size 1.27 1.27))))
      (property "Value" "${name}" (at 0 -2.54 0) (effects (font (size 1.27 1.27))))
      (property "Footprint" "" (at 0 -5.08 0) (effects (font (size 1.27 1.27)) hide))
      (property "Datasheet" "" (at 0 -7.62 0) (effects (font (size 1.27 1.27)) hide))
      (symbol "${name}_0_1"
        (rectangle (start -2.54 1.016) (end 2.54 -1.016)
          (stroke (width 0.254) (type default))
          (fill (type none))
        )
      )
      (symbol "${name}_1_1"
        (pin passive line (at -5.08 0 0) (length 2.54)
          (name "~" (effects (font (size 1.27 1.27))))
          (number "1" (effects (font (size 1.27 1.27))))
        )
        (pin passive line (at 5.08 0 180) (length 2.54)
          (name "~" (effects (font (size 1.27 1.27))))
          (number "2" (effects (font (size 1.27 1.27))))
        )
      )
    )
`;
  });
  out += `  )\n`;

  // Wires
  wires.forEach(w => {
    out += `  (wire (pts (xy ${tx(w.x1)} ${ty(w.y1)}) (xy ${tx(w.x2)} ${ty(w.y2)}))
    (stroke (width 0) (type default)) (uuid ${uuid()}))
`;
  });

  // Power-rail symbols (GND + VCC flags → KiCad power symbols)
  rails.forEach(r => {
    const lib = (r.type === 'gnd') ? 'power:GND' : 'power:VCC';
    const label = r.label || (r.type === 'gnd' ? 'GND' : 'VCC');
    out += `  (symbol (lib_id "${lib}") (at ${tx(r.x)} ${ty(r.y)} 0) (unit 1)
    (in_bom yes) (on_board yes) (dnp no)
    (uuid ${uuid()})
    (property "Reference" "#PWR" (at ${tx(r.x)} ${ty(r.y - 20)} 0))
    (property "Value" "${escapeStr(label)}" (at ${tx(r.x)} ${ty(r.y - 10)} 0))
    (property "Footprint" "" (at ${tx(r.x)} ${ty(r.y)} 0) (effects hide))
    (property "Datasheet" "" (at ${tx(r.x)} ${ty(r.y)} 0) (effects hide))
    (pin "1" (uuid ${uuid()}))
  )
`;
  });

  // Components
  components.forEach(c => {
    const libId = KICAD_SYMBOL[c.type] || 'Device:R';
    const bomComp = (circuit.components || []).find(b => b.id === c.id || b.id === c.label) || {};
    const footprint = KICAD_FOOTPRINT[bomComp.package] || '';
    const mpn = bomComp.mpn || '';
    const datasheet = bomComp.datasheet || '';
    const rot = c.rotation || (c.orient === 'vertical' ? 90 : 0);

    out += `  (symbol (lib_id "${libId}") (at ${tx(c.x)} ${ty(c.y)} ${rot}) (unit 1)
    (in_bom yes) (on_board yes) (dnp no)
    (uuid ${uuid()})
    (property "Reference" "${escapeStr(c.label || c.id)}" (at ${tx(c.x + 15)} ${ty(c.y - 15)} 0)
      (effects (font (size 1.27 1.27)) (justify left)))
    (property "Value" "${escapeStr(c.value || '')}" (at ${tx(c.x + 15)} ${ty(c.y + 5)} 0)
      (effects (font (size 1.27 1.27)) (justify left)))
    (property "Footprint" "${footprint}" (at ${tx(c.x)} ${ty(c.y)} 0)
      (effects (font (size 1.27 1.27)) hide))
    (property "Datasheet" "${escapeStr(datasheet)}" (at ${tx(c.x)} ${ty(c.y)} 0)
      (effects (font (size 1.27 1.27)) hide))
    (property "MPN" "${escapeStr(mpn)}" (at ${tx(c.x)} ${ty(c.y)} 0)
      (effects (font (size 1.27 1.27)) hide))
    (pin "1" (uuid ${uuid()}))
    (pin "2" (uuid ${uuid()}))
  )
`;
  });

  // Net labels
  labels.forEach(nl => {
    out += `  (label "${escapeStr(nl.text)}" (at ${tx(nl.x)} ${ty(nl.y)} 0)
    (effects (font (size 1.27 1.27)) (justify ${nl.side === 'right' ? 'left' : 'right'}))
    (uuid ${uuid()}))
`;
  });

  // Sheet instances
  out += `  (sheet_instances
    (path "/" (page "1"))
  )
  (symbol_instances
  )
)
`;
  return out;
}

function refPrefix(libId) {
  if (libId.includes('Device:R')) return 'R';
  if (libId.includes('Device:C')) return 'C';
  if (libId.includes('Device:L')) return 'L';
  if (libId.includes('LED') || libId.includes('Diode')) return 'D';
  if (libId.includes('BJT') || libId.includes('FET') || libId.includes('Transistor')) return 'Q';
  if (libId.includes('Regulator') || libId.includes('Timer') || libId.includes('Logic') || libId.includes('Amplifier')) return 'U';
  if (libId.includes('Connector')) return 'J';
  if (libId.includes('Crystal')) return 'Y';
  if (libId.includes('Battery')) return 'BT';
  if (libId.includes('Switch')) return 'SW';
  return 'U';
}

// ══════════════════════════════════════════════════════════════════════════
// KICAD .kicad_pcb (KiCad 7/8 S-expression PCB)
// ══════════════════════════════════════════════════════════════════════════
function generateKicadPcb(circuit) {
  const pcb = circuit.pcb || {};
  const W = pcb.board_width || 520, H = pcb.board_height || 400;
  const M = pcb.margin || 35;
  const bW = (W - M * 2) * PCB_SCALE;
  const bH = (H - M * 2) * PCB_SCALE;
  const originX = 50, originY = 50;
  const tx = (v) => (originX + (v - M) * PCB_SCALE).toFixed(3);
  const ty = (v) => (originY + (v - M) * PCB_SCALE).toFixed(3);

  let out = `(kicad_pcb (version 20230620) (generator circuit_architect_pro)
  (general (thickness 1.6))
  (paper "A4")
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (32 "B.Adhes" user "B.Adhesive")
    (33 "F.Adhes" user "F.Adhesive")
    (34 "B.Paste" user)
    (35 "F.Paste" user)
    (36 "B.SilkS" user "B.Silkscreen")
    (37 "F.SilkS" user "F.Silkscreen")
    (38 "B.Mask" user)
    (39 "F.Mask" user)
    (40 "Dwgs.User" user "User.Drawings")
    (41 "Cmts.User" user "User.Comments")
    (42 "Eco1.User" user "User.Eco1")
    (43 "Eco2.User" user "User.Eco2")
    (44 "Edge.Cuts" user)
    (45 "Margin" user)
    (46 "B.CrtYd" user "B.Courtyard")
    (47 "F.CrtYd" user "F.Courtyard")
    (48 "B.Fab" user)
    (49 "F.Fab" user)
  )
  (setup
    (pad_to_mask_clearance 0.05)
    (pcbplotparams
      (layerselection 0x00010fc_ffffffff)
      (disableapertmacros false)
      (usegerberextensions false)
      (usegerberattributes true)
      (usegerberadvancedattributes true)
      (creategerberjobfile true)
      (svguseinch false)
      (svgprecision 6)
      (excludeedgelayer true)
      (plotframeref false)
      (viasonmask false)
      (mode 1)
      (useauxorigin false)
      (hpglpennumber 1)
      (hpglpenspeed 20)
      (hpglpendiameter 15.000000)
      (dxfpolygonmode true)
      (dxfimperialunits true)
      (dxfusepcbnewfont true)
      (psnegative false)
      (psa4output false)
      (plotreference true)
      (plotvalue true)
      (plotinvisibletext false)
      (sketchpadsonfab false)
      (subtractmaskfromsilk false)
      (outputformat 1)
      (mirror false)
      (drillshape 1)
      (scaleselection 1)
      (outputdirectory "")
    )
  )
`;

  // Nets
  const netSet = new Set();
  (circuit.netlist || []).forEach(n => netSet.add(n.net));
  const netList = ['', ...Array.from(netSet)];
  netList.forEach((n, i) => {
    out += `  (net ${i} "${escapeStr(n)}")\n`;
  });

  // Edge cuts — board outline rectangle
  const bx0 = originX, by0 = originY, bx1 = originX + bW, by1 = originY + bH;
  out += `  (gr_line (start ${bx0.toFixed(3)} ${by0.toFixed(3)}) (end ${bx1.toFixed(3)} ${by0.toFixed(3)}) (layer "Edge.Cuts") (width 0.1) (tstamp ${uuid()}))
  (gr_line (start ${bx1.toFixed(3)} ${by0.toFixed(3)}) (end ${bx1.toFixed(3)} ${by1.toFixed(3)}) (layer "Edge.Cuts") (width 0.1) (tstamp ${uuid()}))
  (gr_line (start ${bx1.toFixed(3)} ${by1.toFixed(3)}) (end ${bx0.toFixed(3)} ${by1.toFixed(3)}) (layer "Edge.Cuts") (width 0.1) (tstamp ${uuid()}))
  (gr_line (start ${bx0.toFixed(3)} ${by1.toFixed(3)}) (end ${bx0.toFixed(3)} ${by0.toFixed(3)}) (layer "Edge.Cuts") (width 0.1) (tstamp ${uuid()}))
`;

  // Footprints
  (pcb.components || []).forEach(comp => {
    const bomComp = (circuit.components || []).find(b => b.id === comp.id) || {};
    const footprint = KICAD_FOOTPRINT[bomComp.package || comp.package] || 'Resistor_SMD:R_0805_2012Metric';
    const rot = comp.rotation || 0;
    out += `  (footprint "${footprint}" (layer "F.Cu")
    (tstamp ${uuid()}) (at ${tx(comp.x)} ${ty(comp.y)} ${rot})
    (attr smd)
    (fp_text reference "${escapeStr(comp.id)}" (at 0 -2 ${rot}) (layer "F.SilkS") (effects (font (size 1 1) (thickness 0.15))) (tstamp ${uuid()}))
    (fp_text value "${escapeStr(bomComp.value || '')}" (at 0 2 ${rot}) (layer "F.Fab") (effects (font (size 1 1) (thickness 0.15))) (tstamp ${uuid()}))
`;
    (comp.pads || []).forEach(pad => {
      const padType = pad.drill ? 'thru_hole' : 'smd';
      const padShape = pad.shape === 'round' ? 'circle' : 'roundrect';
      const layers = pad.drill ? '"*.Cu" "*.Mask"' : '"F.Cu" "F.Paste" "F.Mask"';
      const netRef = findNetForPad(circuit, comp.id, pad.num, netList);
      const padW = (pad.w || 10) * PCB_SCALE;
      const padH = (pad.h || 10) * PCB_SCALE;
      // Pad offset is from footprint origin
      const padX = (pad.x - comp.x) * PCB_SCALE;
      const padY = (pad.y - comp.y) * PCB_SCALE;
      out += `    (pad "${pad.num}" ${padType} ${padShape} (at ${padX.toFixed(3)} ${padY.toFixed(3)}) (size ${padW.toFixed(3)} ${padH.toFixed(3)}) ${pad.drill ? `(drill ${pad.drill})` : '(roundrect_rratio 0.25)'} (layers ${layers})${netRef !== null ? ` (net ${netRef} "${escapeStr(netList[netRef])}")` : ''} (tstamp ${uuid()}))
`;
    });
    out += `  )\n`;
  });

  // Traces (segments)
  (pcb.traces || []).forEach(trace => {
    const layer = trace.layer === 'back' ? 'B.Cu' : 'F.Cu';
    const width = trace.width || 0.3;
    const netIdx = netList.indexOf(trace.net);
    const points = trace.points || [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      out += `  (segment (start ${tx(x1)} ${ty(y1)}) (end ${tx(x2)} ${ty(y2)}) (width ${width}) (layer "${layer}") (net ${Math.max(netIdx, 0)}) (tstamp ${uuid()}))
`;
    }
  });

  // Vias
  (pcb.vias || []).forEach(v => {
    const drill = v.drill || 0.3;
    const outer = v.outer || 0.6;
    out += `  (via (at ${tx(v.x)} ${ty(v.y)}) (size ${outer}) (drill ${drill}) (layers "F.Cu" "B.Cu") (net 0) (tstamp ${uuid()}))
`;
  });

  out += `)\n`;
  return out;
}

function findNetForPad(circuit, compId, padNum, netList) {
  const ref = `${compId}.${padNum}`;
  const net = (circuit.netlist || []).find(n => (n.pins || []).some(p => p === ref));
  if (!net) return null;
  const idx = netList.indexOf(net.net);
  return idx >= 0 ? idx : null;
}

// ══════════════════════════════════════════════════════════════════════════
// KICAD .kicad_pro (project metadata)
// ══════════════════════════════════════════════════════════════════════════
function generateKicadPro(circuit) {
  return JSON.stringify({
    board: { design_settings: { defaults: {} } },
    boards: [],
    cvpcb: {},
    erc: {},
    libraries: {},
    meta: {
      filename: `${safeName(circuit)}.kicad_pro`,
      version: 1
    },
    net_settings: {
      classes: [{ name: 'Default', clearance: 0.2, track_width: 0.3, via_diameter: 0.6, via_drill: 0.3 }]
    },
    pcbnew: {},
    schematic: {
      legacy_lib_dir: '',
      legacy_lib_list: []
    },
    sheets: [],
    text_variables: {}
  }, null, 2);
}

// ══════════════════════════════════════════════════════════════════════════
// EAGLE .sch XML (Altium imports EAGLE natively up to v9)
// ══════════════════════════════════════════════════════════════════════════
function generateEagleSch(circuit) {
  const sch = circuit.schematic || {};
  const components = sch.components || [];
  const wires = sch.wires || [];

  const gridUnit = 0.1; // Eagle uses inches typically; we'll use mm.
  const tx = (v) => (v * SCH_SCALE).toFixed(3);
  const ty = (v) => (-v * SCH_SCALE).toFixed(3); // Eagle Y is inverted

  let parts = '';
  let instances = '';
  components.forEach((c, i) => {
    const ref = c.label || c.id || `U${i + 1}`;
    const val = c.value || '';
    const eaglePkg = KICAD_FOOTPRINT[c.package] ? c.package : '0805';
    parts += `      <part name="${escapeStr(ref)}" library="generic" deviceset="${c.type.toUpperCase()}" device="" value="${escapeStr(val)}"/>\n`;
    instances += `      <instance part="${escapeStr(ref)}" gate="G$1" x="${tx(c.x)}" y="${ty(c.y)}"/>\n`;
  });

  let segments = '';
  wires.forEach(w => {
    segments += `          <wire x1="${tx(w.x1)}" y1="${ty(w.y1)}" x2="${tx(w.x2)}" y2="${ty(w.y2)}" width="0.1524" layer="91"/>\n`;
  });

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE eagle SYSTEM "eagle.dtd">
<eagle version="7.5.0">
  <drawing>
    <settings>
      <setting alwaysvectorfont="no"/>
      <setting verticaltext="up"/>
    </settings>
    <grid distance="2.54" unitdist="mm" unit="mm" style="lines" multiple="1" display="yes" altdistance="0.254" altunitdist="mm" altunit="mm"/>
    <layers>
      <layer number="91" name="Nets" color="2" fill="1" visible="yes" active="yes"/>
      <layer number="93" name="Pins" color="2" fill="1" visible="yes" active="yes"/>
      <layer number="94" name="Symbols" color="4" fill="1" visible="yes" active="yes"/>
      <layer number="95" name="Names" color="7" fill="1" visible="yes" active="yes"/>
      <layer number="96" name="Values" color="7" fill="1" visible="yes" active="yes"/>
    </layers>
    <schematic>
      <description>${escapeStr(circuit.name || 'Circuit Architect Design')} - generated by Circuit Architect Pro</description>
      <libraries>
        <library name="generic">
          <packages/>
          <symbols/>
          <devicesets/>
        </library>
      </libraries>
      <attributes/>
      <variantdefs/>
      <classes>
        <class number="0" name="default" width="0" drill="0"/>
      </classes>
      <parts>
${parts}      </parts>
      <sheets>
        <sheet>
          <plain/>
          <instances>
${instances}          </instances>
          <busses/>
          <nets>
            <net name="UNNAMED" class="0">
              <segment>
${segments}              </segment>
            </net>
          </nets>
        </sheet>
      </sheets>
    </schematic>
  </drawing>
</eagle>
`;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function escapeStr(s) {
  return String(s || '').replace(/"/g, '\\"').replace(/\n/g, ' ');
}
function safeName(circuit) {
  return (circuit.name || 'circuit').replace(/[^a-zA-Z0-9_-]+/g, '_');
}

function exportAll(circuit) {
  const name = safeName(circuit);
  return {
    [`${name}.kicad_sch`]: generateKicadSch(circuit),
    [`${name}.kicad_pcb`]: generateKicadPcb(circuit),
    [`${name}.kicad_pro`]: generateKicadPro(circuit),
    [`${name}.sch`]:        generateEagleSch(circuit),  // EAGLE — Altium imports
    'README.txt': buildReadme(circuit, name),
  };
}

function buildReadme(circuit, name) {
  return `Circuit Architect Pro — EDA Project Export
===========================================
Circuit: ${circuit.name || 'Untitled'}
Generated: ${new Date().toISOString()}

FILES
-----
  ${name}.kicad_sch   KiCad 7/8 schematic (S-expression format)
  ${name}.kicad_pcb   KiCad 7/8 PCB layout
  ${name}.kicad_pro   KiCad project file
  ${name}.sch         EAGLE 7.x schematic (for Altium import)

HOW TO OPEN
-----------
  KiCad 7/8: File > Open Project > select ${name}.kicad_pro
  Altium Designer 24+: File > Import Wizard > KiCad ${name}.kicad_pcb
  Altium Designer 20–23: File > Import Wizard > CircuitMaker/EAGLE > ${name}.sch

COMPONENTS
----------
${(circuit.components || []).map(c =>
  `  ${c.id}: ${c.type} ${c.value} (${c.package || '?'}) — ${c.mpn || 'generic'}`
).join('\n')}

NOTES
-----
- KiCad symbols reference the official Device / Timer / Regulator_Linear /
  Transistor_BJT / Amplifier_Operational / Connector libraries. These ship
  with KiCad 7+.
- Footprints reference Resistor_SMD, Package_SO, Package_DIP, and
  Package_TO_SOT_THT libraries, also shipped with KiCad.
- For production, verify DRC rules inside KiCad/Altium before fabricating.
`;
}

module.exports = {
  generateKicadSch,
  generateKicadPcb,
  generateKicadPro,
  generateEagleSch,
  exportAll,
};
