# ⚡ Circuit Architect Pro

AI-powered circuit schematic + PCB layout designer with:
- **User auth** (register/login, JWT, saved projects)
- **Real parts database** (200+ components with manufacturer datasheets)
- **DRC engine** (IPC-2221 / JLCPCB design rule checker)
- **Circuit simulation** (DC operating point, 555 timer calculations)
- **Manufacturing exports** (Gerbers, BOM with datasheets, Excellon drill)

---

## 🚀 Deploy in 10 Minutes (Railway — Free, No Credit Card)

### Step 1 — Get a free Groq API key (fastest AI, free tier)
1. Go to **console.groq.com** → sign up free
2. Click **API Keys** → **Create API Key**
3. Copy the key (starts with `gsk_...`)

> Alternatively use Anthropic: **console.anthropic.com** → API Keys → Create Key (`sk-ant-...`)

---

### Step 2 — Push to GitHub
1. Create account at **github.com** if needed
2. New repository → name it `circuit-architect-pro` → Public → Create
3. Open terminal in this folder and run:

```bash
git init
git add .
git commit -m "Circuit Architect Pro v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/circuit-architect-pro.git
git push -u origin main
```

---

### Step 3 — Deploy on Railway
1. Go to **railway.app** → sign up with GitHub (free)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `circuit-architect-pro`
4. Railway auto-detects Node.js and starts building ✓

---

### Step 4 — Add your environment variables
In your Railway project → click the service → **Variables** tab → add:

| Variable | Value |
|---|---|
| `GROQ_API_KEY` | `gsk_your_key_here` |
| `JWT_SECRET` | Any long random string (e.g. `circuit-pro-secret-abc123xyz`) |

> If using Anthropic instead: add `ANTHROPIC_API_KEY` instead of `GROQ_API_KEY`

Railway redeploys automatically after saving variables.

---

### Step 5 — Get your public URL
1. In Railway → **Settings** tab → **Generate Domain**
2. Your app is live at `https://circuit-architect-pro-xxxx.up.railway.app` 🎉

---

## 💻 Run Locally

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Edit .env — add GROQ_API_KEY and set JWT_SECRET

# Start
npm start
# → http://localhost:3000
```

---

## 📁 Project Structure

```
circuit-architect-pro/
├── server.js               # Express entry point
├── package.json
├── railway.toml            # Railway config
├── .env.example
├── routes/
│   ├── auth.js             # POST /api/auth/register|login, GET /api/auth/me
│   ├── projects.js         # CRUD /api/projects (auth required)
│   └── generate.js         # POST /api/generate, /api/generate/drc, /simulate
├── lib/
│   ├── auth.js             # JWT sign/verify middleware
│   ├── drc.js              # DRC + ERC engine + SPICE-lite simulator
│   └── parts.js            # 200+ real parts database with datasheets
├── db/
│   └── store.js            # File-based JSON store (no external DB needed)
├── data/                   # Auto-created: users.json, projects.json
└── public/
    └── index.html          # Full SPA frontend
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login, get JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/projects` | JWT | List projects |
| POST | `/api/projects` | JWT | Save project |
| GET | `/api/projects/:id` | JWT | Load project |
| PUT | `/api/projects/:id` | JWT | Update project |
| DELETE | `/api/projects/:id` | JWT | Delete project |
| POST | `/api/generate` | No | Generate circuit |
| POST | `/api/generate/drc` | No | Re-run DRC |
| POST | `/api/generate/simulate` | No | Re-run simulation |
| GET | `/health` | No | Health check |

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | JWT tokens, bcrypt passwords, 30-day sessions |
| **Projects** | Save, load, delete circuits per user |
| **Parts DB** | 200+ real MPNs: Yageo, Murata, TI, Microchip, Infineon, ST, ADI… |
| **Datasheets** | Every component links to official manufacturer datasheet |
| **Schematic** | 20+ component symbols, power rails, net labels |
| **PCB Layout** | 2-layer board, copper traces, vias, pads, courtyard, silkscreen |
| **DRC** | Trace width, clearance, annular ring, overlap, ERC checks |
| **Simulation** | DC operating point, LED/transistor/regulator analysis, 555 calc |
| **Gerbers** | Edge.Cuts, F.Cu, B.Cu, F.SilkS — JLCPCB/PCBWay ready |
| **BOM** | CSV with MPN, manufacturer, value, package, datasheet URL |
| **Drill** | Excellon format for PTH and vias |

---

## 🏭 PCB Manufacturers (upload your Gerbers directly)

- **JLCPCB** — jlcpcb.com (5 boards from $2)
- **PCBWay** — pcbway.com
- **OSH Park** — oshpark.com (US, purple boards)
- **Eurocircuits** — eurocircuits.com (EU)

---

## 🔒 Security Notes

- API keys are **server-side only** — never sent to the browser
- Passwords are bcrypt-hashed (cost factor 10)
- JWT tokens expire after 30 days
- Add `express-rate-limit` for production rate limiting
- For production: use PostgreSQL instead of file-based JSON store

---

Built with ❤️ using Claude AI + Groq + Express
