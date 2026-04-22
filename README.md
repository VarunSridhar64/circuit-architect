# ⚡ Circuit Architect — AI PCB Designer

Generate schematics and manufacturing-ready PCB layouts from plain English descriptions.
Powered by Claude AI.

---

## 🚀 Deploy in 5 Minutes (Railway — Recommended)

Railway is the easiest way. Free tier, no credit card required.

### Step 1 — Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Click **API Keys** in the left sidebar
4. Click **Create Key**, give it a name like "circuit-architect"
5. Copy the key (starts with `sk-ant-...`) — you'll only see it once

### Step 2 — Push code to GitHub
1. Create a free account at https://github.com if you don't have one
2. Click **+** → **New repository**, name it `circuit-architect`, set to Public
3. On your computer, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/circuit-architect.git
git push -u origin main
```

### Step 3 — Deploy on Railway
1. Go to https://railway.app and sign up with your GitHub account
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `circuit-architect` repository
4. Railway detects Node.js automatically and starts building

### Step 4 — Add your API key
1. In your Railway project, click on the service
2. Go to **Variables** tab
3. Click **New Variable**
4. Name: `ANTHROPIC_API_KEY`  Value: `sk-ant-your-key-here`
5. Railway automatically redeploys

### Step 5 — Get your public URL
1. Go to **Settings** tab in your Railway service
2. Click **Generate Domain**
3. Your site is live at `https://circuit-architect-xxxx.up.railway.app` 🎉

---

## 💻 Run Locally

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start server
npm start

# Open http://localhost:3000
```

---

## 📁 Project Structure

```
circuit-architect/
├── server.js          # Express backend (API proxy)
├── package.json       # Node.js dependencies
├── railway.toml       # Railway deployment config
├── .env.example       # Environment variable template
└── public/
    └── index.html     # Complete frontend (schematic + PCB renderer)
```

---

## 🔒 Security

- Your Anthropic API key **never reaches the browser** — it lives only in Railway's environment variables
- The `/api/generate` endpoint validates and sanitizes all inputs
- Rate limiting can be added via Railway's built-in protection or a middleware like `express-rate-limit`

---

## ✨ Features

- **AI Schematic Generation** — resistors, caps, ICs, transistors, op-amps, 555 timers, and more
- **Manufacturing-Ready PCB Layout** — 2-layer board with traces, vias, pads, courtyard, silkscreen
- **Gerber Export** — F.Cu, B.Cu, Edge.Cuts, F.SilkS layers ready for JLCPCB/PCBWay/OSH Park
- **Excellon Drill File** — PTH and via drill positions
- **BOM CSV Export** — reference, value, package, purpose
- **Schematic SVG Export** — clean vector for documentation

---

## 🛠 Other Deployment Options

### Render (also free)
1. Push to GitHub (same as Step 2 above)
2. Go to https://render.com → New → Web Service
3. Connect GitHub repo, select Node, build command: `npm install`, start: `npm start`
4. Add `ANTHROPIC_API_KEY` in Environment tab

### Fly.io
```bash
npm install -g flyctl
flyctl auth login
flyctl launch
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
flyctl deploy
```

### VPS (DigitalOcean/Linode/etc.)
```bash
# On server
git clone https://github.com/YOUR_USERNAME/circuit-architect.git
cd circuit-architect
npm install
export ANTHROPIC_API_KEY=sk-ant-your-key-here
# Use pm2 for production:
npm install -g pm2
pm2 start server.js --name circuit-architect
pm2 save
```

---

## 📞 Support

Built with ❤️ using Circuit Architect + Claude AI
