// routes/generate.js
const express = require('express');
const fetch = require('node-fetch');
const { runDRC, simulateCircuit } = require('../lib/drc');

const router = express.Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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

DESIGN RULES (IPC-2221 / JLCPCB):
- Min trace 0.1mm (prefer 0.2mm); min clearance 0.1mm
- Min drill 0.3mm (prefer 0.8mm for THT); min annular ring 0.13mm
- Min via: drill 0.3mm, outer 0.6mm
- Board edge clearance 0.3mm minimum
- Bypass cap 100nF on EVERY IC VCC pin, placed within 5mm
- Bulk cap 10µF near power entry
- Trace current capacity: 0.2mm ~500mA, 0.5mm ~1A, 1mm ~2A

ERC RULES:
- Every VCC net must be connected to a power source
- No floating inputs — pull up or pull down
- Polarized components need correct orientation
- LED current-limiting: R = (Vsupply - Vf) / 20mA where Vf=2V red/green, 3.3V blue/white

Return this EXACT JSON schema:
{
  "name": "descriptive circuit name",
  "description": "3-4 sentence technical explanation",
  "specs": {
    "supply_voltage": "9V", "current_draw": "~15mA", "board_size": "50x40mm",
    "layers": "2", "min_trace": "0.2mm", "min_drill": "0.8mm",
    "operating_temp": "-40°C to +85°C"
  },
  "components": [
    {
      "id": "R1", "mpn": "RC0805FR-0710KL", "mfr": "Yageo",
      "type": "Resistor", "value": "10kΩ", "package": "0805",
      "purpose": "Pull-up on RESET", "quantity": 1,
      "datasheet": "https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf"
    }
  ],
  "netlist": [
    {"net": "VCC", "pins": ["J1.1", "C1.1", "U1.VCC"]},
    {"net": "GND", "pins": ["J1.2", "C1.2", "U1.GND"]}
  ],
  "design_notes": ["Keep crystal traces short", "Add bypass cap near U1"],
  "schematic": {
    "width": 700, "height": 500,
    "components": [{"id":"R1","type":"resistor","x":350,"y":200,"orient":"horizontal","label":"R1","value":"10kΩ"}],
    "wires": [{"x1":100,"y1":60,"x2":100,"y2":420}],
    "power_rails": [{"type":"vcc","x":100,"y":50,"label":"VCC"},{"type":"gnd","x":350,"y":460,"label":"GND"}],
    "net_labels": []
  },
  "pcb": {
    "board_width": 520, "board_height": 400, "margin": 35,
    "components": [{"id":"R1","package":"0805","x":140,"y":180,"rotation":0,"side":"front","pads":[{"num":1,"x":128,"y":180,"w":16,"h":12},{"num":2,"x":152,"y":180,"w":16,"h":12}]}],
    "traces": [{"net":"VCC","layer":"front","width":0.4,"points":[[80,90],[140,90],[140,180]]}],
    "vias": []
  }
}

CRITICAL REQUIREMENTS:
1. Include decoupling caps (100nF + 10µF) near every IC
2. All PCB component x,y must be within margin to (board_width-margin)
3. Schematic wires must be orthogonal (horizontal/vertical only)
4. Always include real MPN and datasheet URL for every component
5. LED resistor values must be calculated from V=IR
6. Return ONLY the JSON object — no other text`;
}

// POST /api/generate
router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 3000)
    return res.status(400).json({ error: 'Invalid prompt' });

  const systemPrompt = buildSystemPrompt();

  try {
    let rawText = '';

    // Try Groq first, fall back to Anthropic
    if (GROQ_API_KEY) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 6000,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      });
      if (!response.ok) throw new Error(`Groq: ${response.status}`);
      const data = await response.json();
      rawText = data.choices[0].message.content.trim();

    } else if (ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 6000,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      if (!response.ok) throw new Error(`Anthropic: ${response.status}`);
      const data = await response.json();
      rawText = (data.content || []).map(b => b.text || '').join('').trim();

    } else {
      return res.status(500).json({ error: 'No AI API key configured' });
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI returned no valid JSON' });

    const circuit = JSON.parse(jsonMatch[0]);

    // Run DRC + simulation server-side
    const drc = runDRC(circuit);
    const simulation = simulateCircuit(circuit);

    res.json({ circuit, drc, simulation });

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

module.exports = router;