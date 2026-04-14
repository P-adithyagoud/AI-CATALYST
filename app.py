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

# Map normalised skill slug → DataFrame
SKILL_DB: dict[str, pd.DataFrame] = {}

CSV_SKILL_MAP = {
    "c_datastructures_tutorials.csv": ["c data structures", "data structures in c", "c datastructures"],
    "cpp_tutorials.csv":              ["c++", "cpp", "cplusplus", "c plus plus"],
    "dsa_in_cpp.csv":                 ["dsa in c++", "dsa cpp", "data structures algorithms c++", "dsa in cpp"],
    "dsa_in_java.csv":                ["dsa in java", "dsa java", "data structures algorithms java"],
    "dsa_in_python__1_.csv":          ["dsa in python", "dsa python", "data structures algorithms python"],
    "java_tutorials.csv":             ["java", "java programming", "java tutorials"],
    "python_tutorials.csv":           ["python", "python programming", "python tutorials"],
}

def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower().strip())

for filename, aliases in CSV_SKILL_MAP.items():
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        continue
    try:
        df = pd.read_csv(path)
        # Rename link_status column gracefully
        df = df.loc[:, ~df.columns.str.contains("link_status", case=False)]
        for alias in aliases:
            SKILL_DB[_normalize(alias)] = df
    except Exception as e:
        print(f"[WARN] Could not load {filename}: {e}")

print(f"[INFO] Loaded skill keys: {list(SKILL_DB.keys())}")

# ──────────────────────────────────────────────
# 2. Helper: CSV row → response dict
# ──────────────────────────────────────────────
def row_to_resource(row: pd.Series, rank: int) -> dict:
    url = str(row.get("playlist_url", row.get("url", ""))).strip()
    return {
        "rank":           rank,
        "title":          str(row.get("playlist_title", row.get("title", "Untitled"))).strip(),
        "channel":        str(row.get("channel_name",   row.get("channel", "Unknown"))).strip(),
        "type":           "playlist",
        "level":          str(row.get("level", "All Levels")).strip(),
        "duration_hours": str(row.get("duration_hours", "N/A")).strip(),
        "url":            url,
        "description":    str(row.get("description", "")).strip(),
    }

# ──────────────────────────────────────────────
# 3. Helper: level filter
# ──────────────────────────────────────────────
LEVEL_KEYWORDS = {
    "beginner":     ["beginner", "basic", "intro", "fundamental", "starter", "all"],
    "intermediate": ["intermediate", "medium", "mid", "moderate", "all"],
    "advanced":     ["advanced", "expert", "pro", "senior", "all"],
}

def _level_matches(row_level: str, requested: str) -> bool:
    rl   = row_level.lower()
    kws  = LEVEL_KEYWORDS.get(requested.lower(), ["all"])
    # A range like "Beginner-Advanced" covers everything
    if "-" in rl or "to" in rl:
        return True
    return any(k in rl for k in kws)

def filter_by_level(df: pd.DataFrame, level: str) -> pd.DataFrame:
    if not level or level.lower() == "all":
        return df
    mask = df["level"].apply(lambda v: _level_matches(str(v), level))
    filtered = df[mask]
    return filtered if not filtered.empty else df   # fallback: return all if no match

# ──────────────────────────────────────────────
# 4. LLM fallback via Anthropic SDK
# ──────────────────────────────────────────────
SYSTEM_PROMPT = """You are a strict YouTube learning resource recommendation engine.
Your ONLY job is to return a JSON array — no explanation, no markdown, no code fences.

Rules:
1. Return EXACTLY 10 objects — no more, no less.
2. Prefer YouTube PLAYLISTS over individual videos.
3. No channel homepage URLs (e.g. youtube.com/@SomeChannel).
4. No YouTube Shorts (under 60 seconds).
5. No duplicate channels unless unavoidable.
6. All URLs must be real, direct YouTube playlist or video links.
7. Rank by: completeness → teaching clarity → popularity → recency → level match.

Output format (raw JSON array only):
[
  {
    "rank": 1,
    "title": "",
    "channel": "",
    "type": "playlist",
    "level": "",
    "duration_hours": "",
    "url": "",
    "description": ""
  }
]"""

def llm_fallback(skill: str, level: str) -> list[dict]:
    # Reads GROQ_API_KEY from env
    client = Groq()
    user_msg = (
        f"Return the TOP 10 best YouTube resources for learning: {skill}\n"
        f"Target level: {level}\n"
        f"Respond ONLY with a valid JSON array — no text before or after."
    )
    
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg}
        ],
        temperature=0.2,
        max_tokens=2048,
    )
    
    raw = completion.choices[0].message.content.strip()
    # Strip any accidental markdown fences
    raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Failed to parse JSON from Groq: {e}\nRaw Content: {raw}")
        raise ValueError("LLM did not return a valid JSON array")

    if not isinstance(data, list):
        raise ValueError("LLM did not return a JSON array")
        
    # Re-index ranks
    for i, item in enumerate(data, 1):
        item["rank"] = i
    return data[:10]

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

    normalized_skill = _normalize(skill)

    # ── CSV lookup (exact + partial match) ──
    matched_df: pd.DataFrame | None = None

    def _word_match(needle: str, haystack: str) -> bool:
        """True if needle is a full-word substring of haystack (or vice versa), min 4 chars."""
        if len(needle) < 4 or len(haystack) < 4:
            return False
        padded_h = f" {haystack} "
        padded_n = f" {needle} "
        return (f" {needle} " in padded_h or
                f" {haystack} " in padded_n or
                haystack.startswith(needle + " ") or
                haystack.endswith(" " + needle) or
                needle.startswith(haystack + " ") or
                needle.endswith(" " + haystack))

    # Exact key match
    if normalized_skill in SKILL_DB:
        matched_df = SKILL_DB[normalized_skill]
    else:
        # Smart word-boundary partial match
        for key, df in SKILL_DB.items():
            if _word_match(normalized_skill, key):
                matched_df = df
                break

    if matched_df is not None:
        filtered = filter_by_level(matched_df, level)
        top10    = filtered.head(10).reset_index(drop=True)
        results  = [row_to_resource(row, i + 1) for i, (_, row) in enumerate(top10.iterrows())]
        return jsonify(results)

    # ── LLM fallback ──
    try:
        results = llm_fallback(skill, level)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": f"LLM fallback failed: {str(e)}"}), 500


# ──────────────────────────────────────────────
# 6. Serve frontend
# ──────────────────────────────────────────────
@app.route("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
