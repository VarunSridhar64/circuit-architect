const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', hasKey: !!ANTHROPIC_API_KEY });
});

// Secure Anthropic API proxy — key never sent to browser
app.post('/api/generate', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server.' });
  }

  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
    return res.status(400).json({ error: 'Invalid prompt.' });
  }

  const systemPrompt = `You are a professional EDA (Electronic Design Automation) AI. Return ONLY raw valid JSON, no markdown, no preamble.

Design a complete circuit and PCB layout for the user's request.

Return this exact JSON schema:
{
  "name": "circuit name",
  "description": "2-3 sentence explanation of how it works",
  "specs": {
    "supply_voltage": "9V",
    "current_draw": "~15mA",
    "board_size": "50x40mm",
    "layers": "2",
    "min_trace": "0.2mm",
    "min_drill": "0.8mm"
  },
  "components": [
    {
      "id": "R1",
      "type": "Resistor",
      "value": "10kΩ",
      "package": "0805",
      "purpose": "current limiting"
    }
  ],
  "netlist": [
    {"net": "VCC", "pins": ["J1.1", "C1.1", "U1.8"]},
    {"net": "GND", "pins": ["J1.2", "C1.2", "R1.2"]}
  ],
  "schematic": {
    "width": 700,
    "height": 480,
    "components": [
      {
        "id": "R1",
        "type": "resistor",
        "x": 350, "y": 200,
        "orient": "horizontal",
        "label": "R1",
        "value": "10kΩ"
      }
    ],
    "wires": [
      {"x1": 100, "y1": 60, "x2": 100, "y2": 420, "net": "VCC"}
    ],
    "power_rails": [
      {"type": "vcc", "x": 100, "y": 50, "label": "VCC"},
      {"type": "gnd", "x": 350, "y": 420, "label": "GND"}
    ],
    "net_labels": [
      {"x": 250, "y": 200, "text": "OUT", "side": "right"}
    ]
  },
  "pcb": {
    "board_width": 500,
    "board_height": 380,
    "margin": 30,
    "components": [
      {
        "id": "R1",
        "package": "0805",
        "x": 120, "y": 150,
        "rotation": 0,
        "side": "front",
        "pads": [
          {"num": 1, "x": 108, "y": 150, "w": 14, "h": 12},
          {"num": 2, "x": 132, "y": 150, "w": 14, "h": 12}
        ]
      }
    ],
    "traces": [
      {"net": "VCC", "layer": "front", "width": 0.4, "points": [[80,80],[120,80],[120,150]]},
      {"net": "GND", "layer": "front", "width": 0.4, "points": [[200,150],[200,300],[80,300]]}
    ],
    "vias": [
      {"x": 200, "y": 200, "drill": 0.8, "outer": 1.6}
    ]
  }
}

Design rules:
- Schematic: realistic positions, avoid overlaps, horizontal/vertical wires only, include power rails and GND symbols
- PCB: logical placement (power near edge, decoupling caps near ICs), all component x/y inside board bounds, pads are absolute coordinates
- Component types (schematic): resistor, capacitor, inductor, led, diode, transistor_npn, transistor_pnp, ic_dip8, ic_dip14, op_amp, voltage_reg, connector, crystal, switch, battery, fuse
- Packages (PCB): 0402, 0603, 0805, 1206, SOT-23, SOT-223, TO-92, TO-220, DIP-8, DIP-14, SOIC-8, SMA, Barrel-Jack, Conn-2pin
- CRITICAL: Return ONLY the JSON object, no other text`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Anthropic API error' });
    }

    const data = await response.json();
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'No valid JSON in AI response' });

    const circuit = JSON.parse(jsonMatch[0]);
    res.json({ circuit });

  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Circuit Architect running on http://localhost:${PORT}`);
  if (!ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY not set. Set it as an environment variable.');
  }
});
