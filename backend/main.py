# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json

from models.schemas import ReviewRequest
from services.vcs_service import get_vcs_context
from services.ai_service import analyze_code_with_ai

app = FastAPI(title="Stateless AI Code Review API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# FIX 1: Removed 'async' from this function definition. 
# FastAPI will now safely run this blocking code in a worker thread.
@app.post("/api/analyze")
def analyze_pr(request: ReviewRequest):
    try:
        print(f"📥 Received request for {request.provider}: {request.repo_owner}/{request.repo_name} PR #{request.pr_number}")
        
        # 1. Fetch live context
        diff, tree = get_vcs_context(
            provider=request.provider,
            owner=request.repo_owner,
            repo=request.repo_name,
            pr_num=request.pr_number,
            token=request.token
        )
        
        # FIX 2: Print the sizes of our payloads to ensure we aren't choking the connection
        print(f"✅ Context fetched. Diff size: {len(diff)} chars, Tree size: {len(tree)} chars.")
        print("🧠 Sending data to Gemini... (This may take 10-20 seconds)")
        
        # 2. Run the AI analysis
        ai_json_string: str = analyze_code_with_ai(tree, diff)
        
        print("✅ Gemini responded successfully! Parsing JSON...")
        
        # 3. Parse the stringified JSON
        result: dict = json.loads(ai_json_string)
        return result

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))