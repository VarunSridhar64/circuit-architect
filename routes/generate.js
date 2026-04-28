// routes/generate.js
const express = require('express');
const fetch = require('node-fetch');
const { runDRC, simulateCircuit } = require('../lib/drc');
const { autoRoute } = require('../lib/router');
const { exportAll } = require('../lib/kicad-export');

const router = express.Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const MAX_DRC_ITERATIONS = 5;

function buildSystemPrompt() {
  return `You are a world-class EDA (Electronic Design Automation) AI with deep knowledge of electronics engineering, PCB design, IPC-2221 standards, JLCPCB design rules, and all major component families from Yageo, Murata, TI, Microchip, Infineon, ST, ADI, onsemi, Vishay, Panasonic, NXP, Bosch, Maxim, Espressif, Nexperia, Bourns, Diodes Inc, Fairchild, Samsung, Kemet, Lite-On, Kingbright, JST, Molex, and more.

Return ONLY raw valid JSON — no markdown, no preamble, no explanation.

You have ENCYCLOPEDIC knowledge of every standard component, MPN, package, and datasheet URL. Use real manufacturer part numbers. Include the full datasheet URL (official manufacturer site) for EVERY component in the BOM. Examples of real parts you should use:
- Resistors: Yageo RC0805FR-07{value}L, Panasonic ERJ-6ENF{value}V
- Ceramic caps: Samsung CL21B{value}KBCNNNC, Murata GRM188R71H{value}KA93
- Electrolytic: Nichicon UVR series, Panasonic EEA-GA
- LEDs: Lite-On LTST-C191KRKT (red), LTST-C191KGKT (green)
- Diodes: 1N4148W-7-F (signal), 1N4007 (rectifier), SS14 (schottky)
- BJTs: 2N3904/2N3906 (TO-92), MMBT3904/3906 (SOT-23), BC547/BC557
- MOSFETs: 2N7000, BSS138, AO3400A (N-ch), AO3401A (P-ch), IRLZ44N
- Op-amps: LM358, TL071, LM324, MCP6002, OPA2134
- Regulators: LM7805, AMS1117-3.3, MCP1700, XC6206P332MR
- 555 timers: NE555DR2G (SMD), NE555P (DIP)
- MCUs: ATmega328P, ATtiny85, STM32F103C8, ESP32-WROOM-32, RP2040
- Drivers: L293D, L298N, DRV8833, ULN2003
- Logic: 74HC series (SN74HC00/04/08/595), CD4017B, CD4051B
- Crystals: 16MHz HC-49/US (ABLS-16.000MHZ), 32.768kHz SMD
- Connectors: JST PH series, Molex KK, USB-C GCT USB4085, DC barrel PJ-002A

DESIGN RULES (IPC-2221 / JLCPCB — STRICT) — backed by physics:
- Min trace 0.2mm (use 0.3mm for power, 0.5mm for >1A).  Why: IPC-2221 chart sizes copper to limit ΔT≤10°C from I²R heating.
- Min clearance trace-to-trace / trace-to-pad 0.2mm.  Why: ~30V/0.1mm dielectric strength of FR-4 air gap (with derating).
- Min drill 0.3mm; min via drill 0.3mm with 0.6mm outer (annular ring ≥0.15mm). Why: drill bit wander + plating tolerance.
- Board edge clearance ≥0.5mm (use margin ≥35 in SVG units).  Why: V-score / mouse-bite cracking.
- Bypass cap 100nF on EVERY IC VCC pin (placed within 5mm of the pin).  Why: every mm of trace is ~1nH; di/dt × L = supply glitch.  A local cap shorts that loop.
- Bulk cap 10µF near power entry.  Why: low-frequency reservoir; ceramic 100nF handles MHz, electrolytic 10µF handles kHz.
- Component-to-component spacing ≥2mm (≥20 SVG units center-to-center).  Why: hand-soldering reach + thermal coupling.
- Polarized components must have correct orientation marking.  Why: reverse-biasing electrolytics vents them; reverse LED won't conduct or breaks down.

ERC RULES (STRICT — all must pass) — backed by physics:
- Every VCC/power net and GND net MUST appear in the netlist.  Why: KCL — current from VCC must return through GND.
- No floating inputs — pull up or pull down with 10k.  Why: CMOS inputs are MΩ; tiny leakage swings them randomly causing oscillation/excess current.
- Polarized components (LED, diode, electrolytic cap) need correct orientation.
- LED current-limiting: R = (Vsupply − Vf) / I_target.  Vf: red/green 2.0V, yellow 2.1V, blue/white 3.2V; pick I_target=10–20mA.  Why: Shockley exponential — cap voltage variation by limiting current.
- Every IC must have a decoupling capacitor (100nF ceramic, type must include "cap"). The cap's other pin connects to GND.

PIN NAMING — use canonical short names (the placer/router strictly maps these):
- 555 timer (ic_dip8): GND, TRIG, OUT, RESET, CV, THRES, DIS, VCC  — or numeric 1..8
- Op-amp: +, −, OUT, VCC, VEE  (or "V+", "V−", "IN+", "IN−")
- BJT: B, C, E   |   MOSFET: G, D, S
- Diode/LED: A, K   |   Polarised cap: +, −
- Regulator: IN (or VIN), OUT (or VOUT), GND
- Connectors: numeric 1..N
The router DOES accept long aliases (TRIGGER→TRIG, THRESHOLD→THRES, OUTPUT→OUT, CONTROL→CV, DISCHARGE→DIS, ANODE→A, CATHODE→K, BASE→B, COLLECTOR→C, EMITTER→E, GATE→G, DRAIN→D, SOURCE→S, POSITIVE→+, NEGATIVE→−, GROUND→GND, VDD→VCC, VSS→GND), but prefer the short form for clarity.

SCHEMATIC / PCB LAYOUT: Component positions, wires, traces, board dimensions,
and power-rail locations are AUTO-PLACED by a deterministic server-side engine
after you return — DO NOT spend tokens optimizing x/y positions. Set all x/y to
0 and keep wires/traces/power_rails as empty arrays. Focus your effort on:
  * Correct component selection + real MPNs + datasheets
  * Complete, electrically-correct netlist
  * Correct "type" field per component (see list below)
  * Correct "package" + pad layout (pads are used for routing)

Supported schematic "type" values: resistor, capacitor, capacitor_pol, inductor,
led, diode, transistor_npn, transistor_pnp, mosfet_n, op_amp, ic_dip8, ic_soic8,
ic_dip14, ic_dip16, voltage_reg, connector, crystal, battery, switch.
Always provide "label" (e.g. R1) and "value".

Pad layout (RELATIVE to component center at x=0,y=0 — placer will shift):
  * 0805: pads {num:1,x:-16,y:0,w:18,h:14}, {num:2,x:16,y:0,w:18,h:14}
  * 0603: pads at x=±12, w=14, h=12
  * SOIC-8: 8 pads w=14,h=6 — rows at y=±30, pins stepped 12.7 along x
  * DIP-8:  8 TH pads drill 0.8 — rows at y=±45, pins stepped 25 along x
  * TO-220: 3 TH pads at x=-50,0,50 y=0

Return this EXACT JSON schema:
{
  "name": "descriptive circuit name",
  "description": "3-4 sentence technical explanation",
  "specs": {
    "supply_voltage": "9V", "current_draw": "~15mA", "board_size": "50x40mm",
    "layers": "2", "min_trace": "0.3mm", "min_drill": "0.3mm",
    "operating_temp": "-40°C to +85°C"
  },
  "components": [
    {
      "id": "R1", "mpn": "RC0805FR-0710KL", "mfr": "Yageo",
      "type": "Resistor", "value": "10kΩ", "package": "0805",
      "purpose": "Pull-up on RESET", "quantity": 1,
      "datasheet": "https://www.yageo.com/..."
    }
  ],
  "netlist": [
    {"net": "VCC", "pins": ["J1.1", "C1.1", "U1.VCC"]},
    {"net": "GND", "pins": ["J1.2", "C1.2", "U1.GND"]}
  ],
  "design_notes": ["Keep crystal traces short", "Add bypass cap near U1"],
  "schematic": {
    "components": [{"id":"R1","type":"resistor","x":0,"y":0,"label":"R1","value":"10kΩ"}],
    "wires": [],
    "power_rails": [],
    "net_labels": []
  },
  "pcb": {
    "components": [{"id":"R1","package":"0805","x":0,"y":0,"side":"front","pads":[{"num":1,"x":-16,"y":0,"w":18,"h":14},{"num":2,"x":16,"y":0,"w":18,"h":14}]}],
    "traces": [],
    "vias": []
  }
}

CRITICAL REQUIREMENTS:
1. Include decoupling caps (100nF + 10µF) near every IC with type containing "cap"
2. Always include real MPN and datasheet URL for every component
3. LED resistor values must be calculated from V=IR
4. At least one component with type containing "cap" per IC
5. netlist must include both a GND net AND a power net (VCC/VDD/+5V/+3V3/etc.)
6. Every pin on every component must appear in exactly one net
7. Return ONLY the JSON object — no other text`;
}

function buildRepairPrompt(circuit, drc, iteration) {
  const errs = (drc.violations||[]).map(v => `- [${v.code||'ERR'}] ${v.detail}`).join('\n') || '(none)';
  const warns = (drc.warnings||[]).map(v => `- [${v.code||'WARN'}] ${v.detail}`).join('\n') || '(none)';
  return `You previously generated this circuit JSON. The DRC/ERC engine found violations that must be fixed.

Current DRC score: ${drc.score}%
Iteration: ${iteration} / ${MAX_DRC_ITERATIONS}

VIOLATIONS (must fix):
${errs}

WARNINGS (should fix for 100% score):
${warns}

Here is the current circuit (you must return a fully corrected version):
${JSON.stringify(circuit)}

Return ONLY the corrected JSON — full circuit object, same schema. Fix every violation AND every warning. Specifically:
- If "IC missing bypass capacitor", add a 100nF capacitor component (type must include "cap") near every IC, add it to PCB with correct 0805 pads, and connect via netlist
- If "No GND/power net", add them to netlist with the appropriate pins
- If components overlap on PCB, move them apart (≥25 SVG units)
- If a component is too close to the board edge, shift it inward or enlarge the board
- If trace width is too small, increase it to 0.3mm or 0.5mm
- If via drill/annular ring is too small, set drill=0.3, outer=0.8
Return ONLY the full corrected JSON object.`;
}

async function callAI(systemPrompt, userMessage, maxTokens = 6000) {
  if (GROQ_API_KEY) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });
    if (!response.ok) throw new Error(`Groq: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
  if (ANTHROPIC_API_KEY) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    if (!response.ok) throw new Error(`Anthropic: ${response.status}`);
    const data = await response.json();
    return (data.content || []).map(b => b.text || '').join('').trim();
  }
  throw new Error('No AI API key configured');
}

function extractJSON(raw) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI returned no valid JSON');
  return JSON.parse(m[0]);
}

// POST /api/generate
router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 3000)
    return res.status(400).json({ error: 'Invalid prompt' });

  const systemPrompt = buildSystemPrompt();

  try {
    // ── Initial generation ──
    const rawText = await callAI(systemPrompt, prompt);
    let circuit = extractJSON(rawText);
    circuit = autoRoute(circuit);
    let drc = runDRC(circuit);

    const iterationLog = [{
      iteration: 0,
      score: drc.score,
      violations: drc.violations.length,
      warnings: drc.warnings.length
    }];

    // ── Iterative DRC/ERC repair loop ──
    let iteration = 1;
    while (drc.score < 100 && iteration <= MAX_DRC_ITERATIONS) {
      try {
        const repairPrompt = buildRepairPrompt(circuit, drc, iteration);
        const repairRaw = await callAI(systemPrompt, repairPrompt);
        const repaired = autoRoute(extractJSON(repairRaw));
        const newDrc = runDRC(repaired);

        iterationLog.push({
          iteration,
          score: newDrc.score,
          violations: newDrc.violations.length,
          warnings: newDrc.warnings.length
        });

        // Accept the repair only if it didn't regress
        if (newDrc.score >= drc.score) {
          circuit = repaired;
          drc = newDrc;
        }

        if (drc.score >= 100) break;
      } catch (e) {
        iterationLog.push({ iteration, error: e.message });
        break;
      }
      iteration++;
    }

    const simulation = simulateCircuit(circuit);

    res.json({
      circuit,
      drc,
      simulation,
      repair: {
        iterations: iterationLog,
        final_score: drc.score,
        converged: drc.score >= 100
      }
    });

  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: 'Generation failed: ' + err.message });
  }
});

// POST /api/generate/drc — re-run DRC on existing circuit
router.post('/drc', (req, res) => {
  const { circuit } = req.body;
  if (!circuit) return res.status(400).json({ error: 'circuit required' });
  res.json(runDRC(circuit));
});

// POST /api/generate/simulate — re-run simulation
router.post('/simulate', (req, res) => {
  const { circuit } = req.body;
  if (!circuit) return res.status(400).json({ error: 'circuit required' });
  res.json(simulateCircuit(circuit));
});

// POST /api/generate/repair — manually re-run a repair iteration
router.post('/repair', async (req, res) => {
  const { circuit } = req.body;
  if (!circuit) return res.status(400).json({ error: 'circuit required' });
  try {
    const systemPrompt = buildSystemPrompt();
    let current = autoRoute(circuit);
    let drc = runDRC(current);
    const log = [{ iteration: 0, score: drc.score, violations: drc.violations.length, warnings: drc.warnings.length }];

    let iteration = 1;
    while (drc.score < 100 && iteration <= MAX_DRC_ITERATIONS) {
      const repairPrompt = buildRepairPrompt(current, drc, iteration);
      const raw = await callAI(systemPrompt, repairPrompt);
      const repaired = autoRoute(extractJSON(raw));
      const newDrc = runDRC(repaired);
      log.push({ iteration, score: newDrc.score, violations: newDrc.violations.length, warnings: newDrc.warnings.length });
      if (newDrc.score >= drc.score) { current = repaired; drc = newDrc; }
      if (drc.score >= 100) break;
      iteration++;
    }

    res.json({
      circuit: current,
      drc,
      simulation: simulateCircuit(current),
      repair: { iterations: log, final_score: drc.score, converged: drc.score >= 100 }
    });
  } catch (err) {
    console.error('Repair error:', err.message);
    res.status(500).json({ error: 'Repair failed: ' + err.message });
  }
});

// POST /api/generate/export/kicad — return KiCad + EAGLE file contents
router.post('/export/kicad', (req, res) => {
  const { circuit } = req.body;
  if (!circuit) return res.status(400).json({ error: 'circuit required' });
  try {
    const files = exportAll(circuit);
    res.json({ files });
  } catch (err) {
    console.error('KiCad export error:', err.message);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

module.exports = router;
