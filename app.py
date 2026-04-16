import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

import json
import re
import io
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
try:
    from pypdf import PdfReader
    import docx2txt
except ImportError:
    PdfReader = None
    docx2txt = None

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

# ──────────────────────────────────────────────
# 0. Resume Parsing Helpers
# ──────────────────────────────────────────────
def extract_text_from_file(file) -> str:
    """Extracts text from PDF or DOCX files."""
    if not PdfReader or not docx2txt:
        print("[ERROR] Dependencies missing: pypdf or docx2txt not installed.")
        return ""
    
    filename = file.filename.lower()
    try:
        if filename.endswith(".pdf"):
            reader = PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        elif filename.endswith(".docx"):
            return docx2txt.process(file).strip()
        elif filename.endswith(".doc"):
            return docx2txt.process(file).strip()
        else:
            return file.read().decode("utf-8", errors="ignore").strip()
    except Exception as e:
        print(f"[ERROR] Extraction failed for {filename}: {e}")
        return ""

@app.route("/analyze-resume", methods=["POST"])
def analyze_resume():
    """Elite AI Resume Evaluator endpoint."""
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files["file"]
    role = request.form.get("role", "Software Engineer")
    level = request.form.get("level", "Experienced")
    benchmark = request.form.get("benchmark", "Average Company")
    
    resume_text = extract_text_from_file(file)
    if not resume_text:
        return jsonify({"error": "Failed to extract text from resume. Ensure it is a valid PDF or DOCX."}), 400

    prompt = f"""
You are an expert ATS Resume Reviewer and Hiring Manager with 15+ years of experience across tech roles.
Your task is to analyze a candidate's resume against a TARGET ROLE and provide a brutally honest, high-quality, actionable review.

INPUTS:
Target Role: {role}
Benchmark Standard: {benchmark} (FAANG > Tier-1 Startup > Average Company)
Resume Content: {resume_text}

---

EVALUATION FRAMEWORK:
1. ATS COMPATIBILITY: Keyword optimization, missing critical keywords, formatting issues. (Score 0-10)
2. ROLE ALIGNMENT: Match to target role, irrelevant content, missing role-specific skills. (Score 0-10)
3. IMPACT & ACHIEVEMENTS: Result-driven vs task-based, quantification (metrics/numbers). (Score 0-10)
4. STRUCTURE & CLARITY: Readability, flow, section ordering, conciseness. (Score 0-10)
5. SKILLS & PROJECTS ANALYSIS: Relevance, depth, suggestions for missing projects.

---

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "final_score": number (0-10),
  "hire_verdict": "Hire / No Hire / Borderline",
  "market_positioning": "Bottom 30% / Average / Top 20% / Top 5%",
  
  "ats_simulation": {{
    "keyword_match_score": number (0-100),
    "missing_critical_keywords": ["List important keywords missing for the target role"],
    "ats_pass_probability": "Low / Medium / High"
  }},

  "recruiter_snap_judgment": {{
    "first_impression": "Brutally honest 10-second screener summary",
    "verdict": "Shortlist / Reject",
    "top_reasons": ["List the top 5 critical issues clearly"]
  }},

  "category_breakdown": [
    {{ "category": "ATS Compatibility", "weight": "25%", "score": number, "reason": "Be critical of optimization" }},
    {{ "category": "Role Alignment", "weight": "35%", "score": number, "reason": "Identify irrelevant content vs missing skills" }},
    {{ "category": "Impact", "weight": "25%", "score": number, "reason": "Check for metrics and outcomes vs tasks" }},
    {{ "category": "Structure", "weight": "15%", "score": number, "reason": "Evaluate readability and flow" }}
  ],

  "brutal_analysis": {{
    "summary": "2-3 line direct overall evaluation",
    "competition_comparison": "Why would I pick someone else over this candidate?"
  }},

  "what_works": ["Identify what few things actually stand out"],
  
  "rejection_risk": {{
    "reason": "Step-by-step actions to improve the resume"
  }},

  "action_plan": {{
    "project_ideas": [
        {{ "title": "", "description": "", "stack": "", "outcome": "" }}
    ],
    "tools_to_learn": ["Specific certifications or tools to add"],
    "bullet_rewrites": [
        {{ "original": "Weak bullet point", "improved": "Quantified, result-driven rewrite" }}
    ]
  }}
}}

STRICT RULES:
- Be brutally honest, avoid generic praise.
- Give specific rewrites, not vague suggestions.
- Focus on impact, metrics, and role relevance.
- Assume this resume is competing at a top 10% level.
- If the resume domain doesn't match the target role, FAIL it immediately (Hire Verdict: No Hire, Score < 4).
"""


    try:
        client = Groq()
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a brutal, expert hiring manager. You hate sugarcoating and generic resumes. You penalize heavily for domain mismatches and lack of evidence."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        analysis = json.loads(completion.choices[0].message.content.strip())
        return jsonify(analysis)
    except Exception as e:
        print(f"[ERROR] AI Analysis failed: {e}")
        return jsonify({"error": "AI Evaluation failed. Please try again."}), 500
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
CERT_DIR = os.path.join(DATA_DIR, "certifications")
LEETCODE_DIR = os.path.join(DATA_DIR, "leetcode", "leetcode_companies")

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

# ──────────────────────────────────────────────
# 6. Interview Prep (LeetCode)
# ──────────────────────────────────────────────

@app.route("/get-companies", methods=["GET"])
def get_companies():
    """Returns a sorted list of all available companies."""
    try:
        if not os.path.exists(LEETCODE_DIR):
            return jsonify([])
        companies = [d for d in os.listdir(LEETCODE_DIR) if os.path.isdir(os.path.join(LEETCODE_DIR, d))]
        return jsonify(sorted(companies))
    except Exception as e:
        print(f"[ERROR] get-companies: {e}")
        return jsonify([]), 500

@app.route("/get-questions", methods=["GET"])
def get_questions():
    """Returns questions for a specific company."""
    company = request.args.get("company", "").strip()
    if not company:
        return jsonify({"error": "company name is required"}), 400
    
    csv_path = os.path.join(LEETCODE_DIR, company, f"{company}.csv")
    if not os.path.exists(csv_path):
        return jsonify({"error": f"Data for {company} not found"}), 404
    
    try:
        df = pd.read_csv(csv_path)
        # Ensure column names match schema
        # schema: problem_link, problem_name, num_occur
        questions = df.to_dict(orient="records")
        return jsonify({"company": company, "questions": questions})
    except Exception as e:
        print(f"[ERROR] get-questions {company}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/")
def index():
    return app.send_static_file("index.html")

if __name__ == "__main__":
    app.run(debug=True, port=5000)
