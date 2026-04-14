# SkillPath — AI-Powered Skill Recommendation Engine

## 📁 Folder Structure

```
skill-recommender/
├── app.py                   ← Flask backend
├── requirements.txt
├── data/                    ← CSV database (7 files)
│   ├── python_tutorials.csv
│   ├── java_tutorials.csv
│   ├── cpp_tutorials.csv
│   ├── dsa_in_cpp.csv
│   ├── dsa_in_java.csv
│   ├── dsa_in_python__1_.csv
│   └── c_datastructures_tutorials.csv
└── static/                  ← Frontend
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

---

## 🚀 Quick Start (antigravity / pip)

### 1. Install dependencies

```bash
cd skill-recommender
pip install antigravity   # just kidding 😄
pip install -r requirements.txt
```

### 2. Set your Anthropic API key

**Windows (PowerShell):**
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-xxxxxxxxxxxx"
```

**Mac / Linux:**
```bash
export ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxx"
```

Or create a `.env` file (optional — see note below).

### 3. Run the server

```bash
python app.py
```

Open your browser at: **http://localhost:5000**

---

## 🧠 How It Works

| Step | Action |
|------|--------|
| 1 | User enters a skill + level |
| 2 | Backend normalises & matches against 7 CSV files |
| 3 | If match → returns top 10 from CSV instantly |
| 4 | If no match → calls Claude AI (LLM fallback) |
| 5 | Returns strict JSON array of 10 resources |

---

## 🎯 Skills Covered by Local CSV

| Skill | Levels Available |
|-------|-----------------|
| Python | Beginner → Advanced |
| Java | Beginner → Advanced |
| C++ | Beginner → Advanced |
| DSA in C++ | Beginner → Advanced |
| DSA in Java | Beginner → Advanced |
| DSA in Python | Beginner → Intermediate |
| C Data Structures | Beginner → Intermediate |

Any other skill (React, Node.js, Machine Learning, etc.) → **AI fallback**.

---

## 🔌 API Reference

### `POST /get-resource`

**Request:**
```json
{ "skill": "Python", "level": "Beginner" }
```

**Response:**
```json
[
  {
    "rank": 1,
    "title": "Python Tutorial for Beginners",
    "channel": "Corey Schafer",
    "type": "playlist",
    "level": "Beginner",
    "duration_hours": "9",
    "url": "https://www.youtube.com/playlist?list=...",
    "description": "..."
  }
]
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Only for LLM fallback | Your Anthropic API key |

---

## 🛠 Tech Stack

- **Backend:** Flask + pandas + Anthropic SDK
- **Frontend:** Vanilla HTML/CSS/JS (no build step needed)
- **AI Model:** claude-opus-4-5 (fallback)
- **Data:** 7 curated CSV files (70 total resources)
