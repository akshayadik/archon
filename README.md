---

# 🚀 AI Architecture Reviewer

---

An automated, context-aware code review tool that specializes in **Software Architecture** and **Design Patterns**. Unlike standard static analysis, this tool uses Large Language Models (Gemini 1.5 Pro) to understand your repository's structure and detect violations like tight coupling, layer bypasses, and scalability bottlenecks.

### **The Differentiator: Architectural Awareness** 🧠
Most AI reviewers look at code snippets in isolation. This tool fetches the entire repository tree to provide context. It knows if your `Controller` is bypassing the `Service` layer to talk to the `Database` directly—even if the database call is in a different file.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, Lucide Icons |
| **Backend** | FastAPI (Python 3.10+), Pydantic v2 |
| **AI Engine** | Gemini 1.5 Pro (Google GenAI) |
| **VCS Integration** | GitHub REST API, Bitbucket API v2 |

---

## ✨ Key Features

* **Stateless by Design:** No database. No code is ever stored. Analysis happens in-memory and is wiped instantly.
* **Context-Aware:** Analyzes the PR diff in the context of the overall repository file structure.
* **Dual Provider Support:** Seamlessly handles both GitHub and Bitbucket Cloud.
* **Smart URL Parsing:** Just paste a PR link; the tool extracts the owner, repo, and PR number automatically.
* **Visual Diff Viewer:** A custom, lightweight UI to see suggested fixes exactly as they would appear in a code editor.
* **Portable Reports:** Export full architectural reviews to `.md` files to share with your team.

---

## 📂 Project Structure

```text
ai-architecture-reviewer/
├── backend/                 # FastAPI Stateless Engine
│   ├── main.py              # Entry point & CORS
│   ├── services/            # VCS and AI Logic
│   ├── models/              # Pydantic Schemas
│   └── .env                 # API Keys (Local Only)
└── frontend/                # Next.js Dashboard
    ├── src/app/             # UI Pages
    ├── src/components/      # React Components (ReviewCard, Form)
    └── src/lib/             # API Client & Markdown Utils
```

---

## 🚀 Getting Started

### 1. Backend Setup
1.  Navigate to `/backend`.
2.  Install dependencies: `pip install -r requirements.txt`.
3.  Create a `.env` file and add your Gemini API Key:
    ```env
    GEMINI_API_KEY=your_key_here
    ```
4.  Start the server:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

### 2. Frontend Setup
1.  Navigate to `/frontend`.
2.  Install dependencies: `npm install`.
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:3000` in your browser.

---

## 📖 How to Use

1.  **Paste PR Link:** Paste any public or private GitHub/Bitbucket PR URL.
2.  **Provide Token:**
    * **GitHub:** Use a Personal Access Token (PAT).
    * **Bitbucket:** Use an App Password (format: `username:password`) or an OAuth Bearer token.
3.  **Review:** Click "Analyze" and wait ~15 seconds for the AI to build the context and generate the review.
4.  **Export:** Click "Download Report" to save the findings as a Markdown file.

---

## 🔒 Security & Privacy
This tool is **Stateless**.
* We do not store your code.
* We do not store your Access Tokens.
* All data is processed in-memory and deleted immediately after the HTTP response is sent.

---

## 🛠️ Operational Commands

### **Backend (FastAPI)**
| Action | Command |
| :--- | :--- |
| **Start Server** | `uvicorn main:app --reload --port 8000` |
| **Stop Server** | Press `Ctrl + C` in the terminal |
| **View Docs** | Navigate to `http://localhost:8000/docs` (Swagger UI) |

### **Frontend (Next.js)**
| Action | Command |
| :--- | :--- |
| **Start Server** | `npm run dev` |
| **Stop Server** | Press `Ctrl + C` in the terminal |
| **Production Build** | `npm run build && npm run start` |

---

## 📊 Data Schema & API Reference

### **The Request Schema**
This is the payload sent from the Frontend to the `/api/analyze` endpoint.

**Python (Pydantic) / TypeScript (Interface):**
```typescript
{
  "provider": "github" | "bitbucket",
  "repo_owner": "string",
  "repo_name": "string",
  "pr_number": number,
  "token": "string" // PAT or Bearer Token
}
```

### **The Response Schema (The AI Output)**
The backend returns a strictly structured JSON object to ensure UI consistency.

```typescript
{
  "issues": [
    {
      "severity": "Low" | "Medium" | "High" | "Critical",
      "category": "Perf" | "Security" | "Design" | "Maintainability",
      "file_path": "string",
      "line_number": number,
      "title": "string",
      "explanation": "string",
      "suggested_fix": "string",
      "trade_offs": "string",
      "code_diff": "string" // Unified diff format (+/-)
    }
  ]
}
```

---

## 🔌 API Endpoints

### **1. Analyze Pull Request**
* **Endpoint:** `POST /api/analyze`
* **Description:** The core engine. Fetches VCS context, sends it to Gemini 1.5 Pro, and returns architectural insights.
* **Authentication:** None (The API itself is stateless; VCS authentication is passed in the request body).

## Backend Testing
- Github
```
curl -X POST "http://localhost:8000/api/analyze" \
     -H "Content-Type: application/json" \
     -d '{
           "provider": "github",
           "repo_owner": "YOUR_GITHUB_USERNAME",
           "repo_name": "YOUR_ACTUAL_REPO_NAME",
           "pr_number": 1,
           "token": "ghp_YOUR_ACTUAL_TOKEN"
         }'
```
- Bitbucket
```
    curl -X POST "http://localhost:8000/api/analyze" \
     -H "Content-Type: application/json" \
     -d '{
           "provider": "bitbucket",
           "repo_owner": "YOUR_BITBUCKET_WORKSPACENAME",
           "repo_name": "YOUR_ACTUAL_REPO_NAME",
           "pr_number": 42,
           "token": "YOUR_REPO_TOKEN"
         }'
```

### **2. Health Check**
* **Endpoint:** `GET /health`
* **Description:** Returns `{"status": "healthy"}`. Used for deployment monitoring.

---
