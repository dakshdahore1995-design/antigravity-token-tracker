# ⚡ Antigravity AI Token Matrix

> A futuristic, dark-aesthetic daily AI token & credit analytics dashboard for **Google Antigravity**, inspired by GitHub contribution heatmaps, featuring **2D Heatmaps**, **3D Isometric Block Visualizations**, **5-Axis Radar Profiles**, and multi-account cycling across **6 Pro accounts**.

![Antigravity AI Token Matrix Preview](/preview.jpg)

---

## 🌟 Key Features

### 1. 🟢 GitHub-Style Dark Green Contribution Matrix
- **52/53-Week Calendar Grid** covering all 365 days of coding activity.
- **Color scale rules**:
  - **Level 0 (Unlit / Dim)**: `< 50` tokens (resting/empty day).
  - **Level 1**: `50 - 500,000` tokens (subtle dark emerald).
  - **Level 2**: `500,000 - 2,000,000` tokens (medium emerald green).
  - **Level 3**: `2,000,000 - 5,000,000` tokens (vibrant leaf green).
  - **Level 4**: `5,000,000 - 10,000,000` tokens (electric lime green).
  - **Level 5 (Complete Blinding Neon Green)**: `> 10,000,000` tokens with cyan-neon electric drop shadow and pulsating glow!
- **Interactive Tooltip**: Hover over any square to see date, total tokens, input/output ratio, cache hits, cost ($), and top active model.
- **Day Inspector Modal**: Click any day to see all conversations, timestamps, and model calls from that day.

### 2. 🏙️ 3D Isometric Extruded Block Matrix (Three.js)
- Direct reproduction of isometric 3D contribution blocks.
- Every day in the year is rendered as an extruded 3D pillar where **height is proportional to tokens consumed**.
- 360° rotation, tilt, and scroll-to-zoom with orbit controls.
- Interactive raycasting: hover over any 3D pillar to view real-time HUD analytics.
- Toggle between **"Green Heat"** intensity and **"Model Palette"** color coding.

### 3. 🎯 Top Stats Banner ("What's up next, Bart?" Style)
- Personalized header: *"What's up next, Daksh?"* (editable with click-to-rename).
- **Sessions Count** & **Messages / LLM Tool Steps**.
- **Total Tokens** circled with an electric glowing highlight ring.
- **Active Days**, **Current Streak**, and **Longest Streak** with flame badges.
- **Peak Hour** calculation (e.g. 10 PM) and **Favorite Model**.
- **Peak Single-Day Record** & **Lowest Active Day**.
- **Market API Equivalence ($)** & **Prompt Cache Savings**.
- Dynamic quote: *"You've used ~1,174x more tokens than The Little Prince."*

### 4. 👥 6 Pro Accounts Cycling Hub
- Seamless unified aggregate view that pools token usage across all 6 Pro accounts.
- **Quota Progress Bars** showing percentage used per account cycle (e.g., 4.3M / 10M tokens).
- **Status Badges**: `Healthy`, `High Load (Nearing Limit)`, and `Exhausted (Ready to Switch)`.
- **Intelligent Account Switcher Recommendation**: Advises which of your 6 accounts to switch to next based on lowest burn rate.

### 5. 📊 5-Axis Spider Radar & Model Donut Breakdown
- **Radar Signature**: Evaluates Call Volume, Context Depth, Peak Burst Ratio, Generation Output, and Model Diversity.
- **Model Distribution Donut**: Percentage share of tokens between Claude Sonnet, Gemini Flash High/Medium, Gemini Pro, and Claude Opus.
- **Monthly Billing Cycle Comparison**.

---

## 🚀 Quick Start (Local)

### 1. Install Dependencies
```bash
npm install
```

### 2. Sync Local Antigravity Telemetry
This scans your machine's `~/.gemini/antigravity-ide/conversations/*.db` SQLite files and decodes protobuf usage metrics into `public/antigravity-data.json`:
```bash
npm run sync
```

### 3. Start Dev Server
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🌐 1-Click Netlify Deployment

This repository includes a pre-configured `netlify.toml` file ready for static hosting.

### Option A: Via Netlify CLI (Terminal)
```bash
# Build production bundle
npm run build

# Deploy directly to Netlify
npx -y netlify-cli deploy --prod --dir=dist
```

### Option B: Via GitHub & Netlify Dashboard
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Antigravity Token Matrix"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/antigravity-token-matrix.git
   git push -u origin main
   ```
2. Log in to [Netlify](https://app.netlify.com), select **"Add new site" -> "Import an existing project"**, choose your repository.
3. Netlify will auto-detect settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
4. Click **Deploy Site**!

---

## 🛠️ Data Structure & Telemetry Mechanics

Antigravity stores conversation history inside SQLite databases:
`~/.gemini/antigravity-ide/conversations/<conversation-uuid>.db`

Each step contains a protobuf binary blob with:
- **Field 1**: Timestamp in Unix epoch seconds.
- **Field 9 (Usage Metadata)**:
  - Sub-field 1: Output / Completion tokens
  - Sub-field 2: Input / Prompt tokens
  - Sub-field 3: Cached tokens (Prompt Caching hit)
- **Executor Metadata**: Active model configuration (`gemini-3.8-flash-high`, `claude-sonnet-4-6`, `gemini-3.1-pro-low`, etc.).

---

## 🎨 Tech Stack
- **React 19 + Vite**
- **Three.js** (3D Isometric Extruded Block City)
- **Lucide Icons**
- **Canvas Confetti**
- **Vanilla Modern CSS** (Zero bloated CSS frameworks, pure design tokens, glassmorphism, responsive flex/grid)
