import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

import json
import re
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

# ──────────────────────────────────────────────
# 1. Load & index all CSV data at startup
# ──────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CERT_DIR = os.path.join(DATA_DIR, "certifications")

# Map normalised skill slug → DataFrame
PLAYLIST_DB: dict[str, pd.DataFrame] = {}
CERT_DB:     dict[str, pd.DataFrame] = {}

CSV_SKILL_MAP = {
    "c_datastructures_tutorials.csv": ["c data structures", "data structures in c", "c datastructures"],
    "cpp_tutorials.csv":              ["c++", "cpp", "cplusplus", "c plus plus"],
    "dsa_in_cpp.csv":                 ["dsa in c++", "dsa cpp", "data structures algorithms c++", "dsa in cpp"],
    "dsa_in_java.csv":                ["dsa in java", "dsa java", "data structures algorithms java"],
    "dsa_in_python__1_.csv":          ["dsa in python", "dsa python", "data structures algorithms python"],
    "java_tutorials.csv":             ["java", "java programming", "java tutorials"],
    "python_tutorials.csv":           ["python", "python programming", "python tutorials"],
}

# Add certification files to the map
CERT_SKILL_MAP = {
    "Top_10_Python_Certifications-v2.csv": ["python", "python programming"],
    "Top_10_Java_Certifications-v4.csv":   ["java", "java programming"],
    "Top_10_CPP_Certifications-v3.csv":    ["c++", "cpp", "cplusplus"],
    "Top_10_C_Certifications-v2.csv":      ["c", "c programming"],
}

def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower().strip())

# Initialize Playlists
for filename, aliases in CSV_SKILL_MAP.items():
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        try:
            df = pd.read_csv(path)
            df = df.loc[:, ~df.columns.str.contains("link_status", case=False)]
            for alias in aliases:
                PLAYLIST_DB[_normalize(alias)] = df
        except Exception as e:
            print(f"[WARN] Playlist load error {filename}: {e}")

# Initialize Certifications
if os.path.exists(CERT_DIR):
    for filename, aliases in CERT_SKILL_MAP.items():
        path = os.path.join(CERT_DIR, filename)
        if os.path.exists(path):
            try:
                df = pd.read_csv(path)
                for alias in aliases:
                    CERT_DB[_normalize(alias)] = df
            except Exception as e:
                print(f"[WARN] Cert load error {filename}: {e}")

print(f"[INFO] Playlist keys: {list(PLAYLIST_DB.keys())}")
print(f"[INFO] Cert keys: {list(CERT_DB.keys())}")

# ──────────────────────────────────────────────
# 2. Helpers: Row → Dict
# ──────────────────────────────────────────────

def row_to_playlist(row: pd.Series, rank: int) -> dict:
    url = str(row.get("playlist_url", row.get("url", ""))).strip()
    return {
        "rank":           rank,
        "title":          str(row.get("playlist_title", row.get("title", "Untitled"))).strip(),
        "channel":        str(row.get("channel_name",   row.get("channel", "Unknown"))).strip(),
        "level":          str(row.get("level", "All Levels")).strip(),
        "duration_hours": str(row.get("duration_hours", "N/A")).strip(),
        "url":            url,
        "description":    str(row.get("description", "")).strip(),
    }

def row_to_cert(row: pd.Series, rank: int) -> dict:
    return {
        "rank":           rank,
        "title":          str(row.get("Certification / Course Name", "Untitled Cert")).strip(),
        "channel":        str(row.get("Company / Provider", "Educational Provider")).strip(),
        "level":          "All Levels",
        "duration_hours": "Full Course",
        "url":            str(row.get("Link", "#")).strip(),
        "description":    f"Cost: {str(row.get('Cost Structure', 'Contact Provider'))}",
    }

# ──────────────────────────────────────────────
# 3. Helpers: Content Moderation & Search
# ──────────────────────────────────────────────

RESTRICTED_KEYWORDS = [
    "bomb", "weapon", "grenade", "explosion", "murder", "kill", "suicide",
    "drugs", "cocaine", "heroin", "meth", "fentanyl", "marijuana",
    "hack", "bypass", "crack", "ddos", "phishing", "malware", "virus",
    "porn", "sex", "nsfw", "black magic",
    "steal", "shoplifting", "robbery", "scam", "fraud"
]

def is_inappropriate(text: str) -> bool:
    """Checks if the search text contains restricted keywords using word boundaries."""
    if not text:
        return False
    
    text_lower = text.lower()
    for kw in RESTRICTED_KEYWORDS:
        # Use regex to find whole words only (e.g., 'hack' shouldn't block 'biohacking')
        pattern = rf"\b{re.escape(kw)}\b"
        if re.search(pattern, text_lower):
            return True
    return False

LEVEL_KEYWORDS = {
    "beginner":     ["beginner", "basic", "intro", "fundamental", "starter", "all"],
    "intermediate": ["intermediate", "medium", "mid", "moderate", "all"],
    "advanced":     ["advanced", "expert", "pro", "senior", "all"],
}

def _level_matches(row_level: str, requested: str) -> bool:
    rl   = row_level.lower()
    kws  = LEVEL_KEYWORDS.get(requested.lower(), ["all"])
    if "-" in rl or "to" in rl: return True
    return any(k in rl for k in kws)

def filter_by_level(df: pd.DataFrame, level: str) -> pd.DataFrame:
    if not level or level.lower() == "all" or "level" not in df.columns:
        return df
    mask = df["level"].apply(lambda v: _level_matches(str(v), level))
    filtered = df[mask]
    return filtered if not filtered.empty else df

def find_in_db(db: dict, skill: str, map_func, limit=10, level=None):
    normalized = _normalize(skill)
    # Exact match
    if normalized in db:
        df = db[normalized]
        if level: df = filter_by_level(df, level)
        return [map_func(row, i+1) for i, (_, row) in enumerate(df.head(limit).iterrows())]
    
    # Partial match
    for key, df in db.items():
        if normalized in key or key in normalized:
            if level: df = filter_by_level(df, level)
            return [map_func(row, i+1) for i, (_, row) in enumerate(df.head(limit).iterrows())]
    return []

# ──────────────────────────────────────────────
# 4. LLM fallback
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """You are a high-end learning resource recommendation engine.
Your ONLY job is to return a JSON object containing two distinct lists — no explanation, no markdown, no code fences.

JSON Structure:
{
  "playlists": [ ... 10 YouTube playlist objects ... ],
  "certificates": [ ... 10 professional certificate course objects (Coursera, Udemy, etc.) ... ]
}

Rules:
1. Return 10 resources for EACH category.
2. Playlists must be direct YouTube playlist links.
3. Certificates must be from reputable platforms (Coursera, edX, Udemy, etc.).

Object format:
{
  "rank": 1,
  "title": "",
  "channel": "",
  "level": "Beginner/Intermediate/Advanced",
  "duration_hours": "",
  "url": "",
  "description": ""
}"""

def llm_fallback(skill: str, level: str, category: str = "both") -> dict:
    client = Groq()
    
    prompt_instruction = f"Return BOTH top 10 YouTube playlists and top 10 professional certificates for: {skill} ({level})."
    if category == "certificates":
        prompt_instruction = f"Return ONLY top 10 professional certificates for: {skill} ({level}). Leave the 'playlists' key as an empty array []."
    elif category == "playlists":
        prompt_instruction = f"Return ONLY top 10 YouTube playlists for: {skill} ({level}). Leave the 'certificates' key as an empty array []."

    user_msg = (
        f"Instruction: {prompt_instruction}\n"
        f"Respond ONLY with a valid JSON object."
    )
    
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_msg}],
        temperature=0.2,
        max_tokens=2048,
    )
    
    raw = completion.choices[0].message.content.strip()
    raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw); raw = re.sub(r"\n?```$", "", raw)
    
    try:
        data = json.loads(raw)
        if not isinstance(data, dict): data = {"playlists": [], "certificates": []}
        return data
    except:
        return {"playlists": [], "certificates": []}

# ──────────────────────────────────────────────
# 5. Main endpoint
# ──────────────────────────────────────────────

@app.route("/get-resource", methods=["POST"])
def get_resource():
    body = request.get_json(silent=True) or {}
    skill = (body.get("skill") or "").strip()
    level = (body.get("level") or "Beginner").strip()

    if not skill:
        return jsonify({"error": "skill is required"}), 400

    # Content Moderation check
    if is_inappropriate(skill):
        return jsonify({"error": "please kindly search appropiate skills"}), 400

    results = {"playlists": [], "certificates": []}

    # 1. Search Local Playlists
    local_playlists = find_in_db(PLAYLIST_DB, skill, row_to_playlist, level=level)
    results["playlists"] = local_playlists

    # 2. Search Local Certificates
    local_certs = find_in_db(CERT_DB, skill, row_to_cert)
    results["certificates"] = local_certs

    # 3. Use AI if either is missing
    missing_playlists = len(results["playlists"]) == 0
    missing_certs     = len(results["certificates"]) == 0

    if missing_playlists or missing_certs:
        category = "both"
        if not missing_playlists: category = "certificates"
        if not missing_certs:     category = "playlists"
        
        try:
            ai_data = llm_fallback(skill, level, category=category)
            if missing_playlists: results["playlists"] = ai_data.get("playlists", [])
            if missing_certs:     results["certificates"] = ai_data.get("certificates", [])
        except Exception as e:
            print(f"[ERROR] LLM skip: {e}")

    return jsonify(results)

@app.route("/")
def index():
    return app.send_static_file("index.html")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
