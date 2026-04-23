// routes/generate.js
const express = require('express');
const fetch = require('node-fetch');
const { runDRC, simulateCircuit } = require('../lib/drc');
const { getPartsPrompt } = require('../lib/parts');

const router = express.Router();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function buildSystemPrompt() {
  const partsDB = getPartsPrompt();

  return `You are a world-class EDA (Electronic Design Automation) AI with deep knowledge of electronics engineering, PCB design, IPC-2221 standards, JLCPCB design rules, and all major component families.

Return ONLY raw valid JSON — no markdown, no preamble, no explanation.

You have access to a real component database. ALWAYS select actual components from this database by their exact MPN when possible. Include full datasheet URLs in the BOM.

REAL PARTS DATABASE:
${partsDB}

DESIGN RULES (IPC-2221 / JLCPCB):
- Min trace width: 0.1mm (0.2mm preferred)
- Min clearance: 0.1mm trace-to-trace
- Min drill: 0.3mm (0.8mm preferred for through-hole)
- Min annular ring: 0.13mm
- Min via drill: 0.3mm, outer 0.6mm
- Board edge clearance: 0.3mm minimum
- Bypass capacitor: 100nF on EVERY IC VCC pin, placed within 5mm
- Decoupling: 10µF bulk cap near power entry
- Current capacity: 0.2mm trace handles ~500mA, 0.5mm ~1A, 1mm ~2A
- GND plane recommended for digital circuits

ERC RULES:
- Every VCC net must be connected to a power source
- Every output pin must be connected to a load
- No floating inputs — pull up or pull down
- Polarized components (caps, LEDs, diodes) must have correct orientation noted
- Use proper current-limiting resistors for all LEDs (use V=IR, Vf=2V red/green, 3.3V blue/white)

Return this EXACT JSON schema:
{
  "name": "descriptive circuit name",
  "description": "3-4 sentence technical explanation",
  "specs": {
    "supply_voltage": "9V",
    "current_draw": "~15mA",
    "board_size": "50x40mm",
    "layers": "2",
    "min_trace": "0.2mm",
    "min_drill": "0.8mm",
    "operating_temp": "-40°C to +85°C"
  },
  "components": [
    {
      "id": "R1",
      "mpn": "RC0805FR-0710KL",
      "mfr": "Yageo",
      "type": "Resistor",
      "value": "10kΩ",
      "package": "0805",
      "purpose": "Pull-up resistor on RESET line",
      "quantity": 1,
      "datasheet": "https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf"
    }
  ],
  "netlist": [
    {"net": "VCC", "pins": ["J1.1", "C1.1", "U1.VCC"]},
    {"net": "GND", "pins": ["J1.2", "C1.2", "U1.GND"]}
  ],
  "design_notes": ["Add 100nF bypass cap on U1 pin 8", "Keep crystal traces short and away from noisy signals"],
  "schematic": {
    "width": 700,
    "height": 500,
    "components": [
      {"id": "R1", "type": "resistor", "x": 350, "y": 200, "orient": "horizontal", "label": "R1", "value": "10kΩ"}
    ],
    "wires": [
      {"x1": 100, "y1": 60, "x2": 100, "y2": 420}
    ],
    "power_rails": [
      {"type": "vcc", "x": 100, "y": 50, "label": "VCC"},
      {"type": "gnd", "x": 350, "y": 460, "label": "GND"}
    ],
    "net_labels": []
  },
  "pcb": {
    "board_width": 520,
    "board_height": 400,
    "margin": 35,
    "components": [
      {
        "id": "R1", "package": "0805", "x": 140, "y": 180, "rotation": 0, "side": "front",
        "pads": [
          {"num": 1, "x": 128, "y": 180, "w": 16, "h": 12},
          {"num": 2, "x": 152, "y": 180, "w": 16, "h": 12}
        ]
      }
    ],
    "traces": [
      {"net": "VCC", "layer": "front", "width": 0.4, "points": [[80,90],[140,90],[140,180]]}
    ],
    "vias": []
  }
}

CRITICAL DESIGN REQUIREMENTS:
1. Include decoupling caps (100nF + 10µF) near every IC power pin — these MUST appear as components
2. All component x,y in PCB must be within board bounds (margin to board_width-margin)
3. Schematic must have clean orthogonal wiring (no diagonal wires)
4. Select REAL component MPNs from the parts database above whenever possible
5. Always include the full datasheet URL for every component
6. LED resistor values must be calculated: R = (Vsupply - Vf) / If where If = 20mA typical
7. Return ONLY the JSON object — absolutely no other text`;
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
