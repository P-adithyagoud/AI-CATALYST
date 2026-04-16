# SkillPath — AI-Powered Career Accelerator 🚀

**SkillPath** is a high-end, multi-stage platform designed to transform your career journey. It goes beyond simple recommendations, offering a full-suite of tools including specialized learning paths, a brutal AI resume evaluator, and company-specific interview preparation.

---

## ✨ Key Features

### 1. 🧠 AI-Powered Skill Recommendations
- **Multi-Step Flow**: Progress from curated YouTube playlists to professional certifications (Coursera, edX, etc.).
- **Hybrid Search**: Instant results for core skills (Python, Java, C++, DSA) via local curated datasets, with smart fallback to **Groq (Llama-3.3 70B)** for everything else.
- **Smart Filtering**: Results matched to your experience level (Beginner, Intermediate, Advanced).

### 2. 🛡️ Elite AI Resume Evaluator
- **Brutal Feedback**: Simulates a high-pressure FAANG hiring process.
- **ATS Simulation**: Keyword matching and pass probability scoring.
- **Deep Analysis**: Breaks down projects, differentiation, and domain alignment.
- **Actionable Plans**: Provides specific project ideas and bullet points to upgrade your resume.

### 3. 🎯 Company-Specific Interview Prep
- **LeetCode Frequency**: Access topic-wise frequency of questions asked at top tech companies.
- **Direct Links**: Practice directly on LeetCode with one-click navigation.
- **Data-Driven**: Leverages curated CSV data for accurate interview insights.

### 4. 🔒 Enterprise-Grade Security & Safety
- **Content Moderation**: Real-time filtering of inappropriate or harmful search terms.
- **Privacy First**: Local file processing for resume parsing.

---

## 🛠 Tech Stack

- **Backend:** [Flask](https://flask.palletsprojects.com/) (Python) + Pandas
- **AI Intelligence:** [Groq API](https://groq.com/) (Llama-3.3-70b-versatile)
- **Frontend:** Nebula Design System (Vanilla HTML5, CSS3, Modern JavaScript)
- **Parsing:** `pypdf`, `docx2txt` for high-fidelity resume extraction
- **Data:** Custom curated CSV datasets for instant response times

---

## 📁 Project Structure

```text
skill-recommender/
├── app.py                   # Flask backend & AI Logic
├── requirements.txt         # Project dependencies
├── .env                     # API Keys & Configuration
├── data/                    # Curated Databases
│   ├── leetcode/            # Company-specific CSVs
│   ├── certifications/      # Professional course data
│   └── *.csv                # Local skill tutorials
└── static/                  # Nebula UI Frontend
    ├── index.html           # Main SPA layout
    ├── css/style.css        # Premium aesthetics & animations
    └── js/app.js            # Frontend orchestration
```

---

## 🚀 Getting Started

### 1. Requirements
Ensure you have Python 3.8+ installed.

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd skill-recommender

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration
Create a `.env` file in the root directory and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to: `http://localhost:5000`

---

## 🖇 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/get-resource` | Fetches learning resources (Playlists + Certs) |
| `POST` | `/analyze-resume` | Triggers the Elite AI Resume Evaluation |
| `GET` | `/get-companies` | Lists all available companies for interview prep |
| `GET` | `/get-questions` | Fetches specific questions for a company |

---

## 🎨 Design Philosophy
SkillPath uses the **Nebula Design System**—a modern aesthetic focusing on:
- **Glassmorphism**: Sleek, semi-transparent UI elements.
- **Micro-animations**: Dynamic hover states and smooth transitions.
- **Accessibility**: Clear typography and high-contrast color palettes.

---

*Built with ❤️ for the next generation of engineers.*
