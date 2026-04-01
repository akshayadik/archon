from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import time # <-- Add this import
import hashlib # <-- Add this import

from models.schemas import ReviewRequest
from services.vcs_service import get_vcs_context
from services.ai_service import analyze_single_file_with_ai

app = FastAPI(title="Stateless AI Code Review API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# NEW: Simple In-Memory Cache. 
# Key: Unique File Hash | Value: Array of ReviewIssues
# Note: Since your backend is hosted on Render, this memory persists as long as the server is awake!
REVIEW_CACHE = {}

def get_file_hash(repo_name: str, pr_number: int, filename: str, patch: str) -> str:
    """Creates a unique MD5 signature for a file's specific changes in a specific PR."""
    signature = f"{repo_name}_{pr_number}_{filename}_{patch}"
    return hashlib.md5(signature.encode()).hexdigest()

@app.post("/api/analyze")
def analyze_pr(request: ReviewRequest):
    
    def event_stream():
        try:
            yield f"data: {json.dumps({'status': 'info', 'message': 'Fetching repository context...'})}\n\n"
            changed_files, tree = get_vcs_context(
                provider=request.provider,
                owner=request.repo_owner,
                repo=request.repo_name,
                pr_num=request.pr_number,
                token=request.token
            )
            
            yield f"data: {json.dumps({'status': 'info', 'message': f'Found {len(changed_files)} files to review.'})}\n\n"
            
            for index, file_data in enumerate(changed_files):
                filename = file_data.get("filename")
                patch = file_data.get("patch", "")
                
                # --- NEW: CACHE CHECK ---
                file_hash = get_file_hash(request.repo_name, request.pr_number, filename, patch)
                
                if file_hash in REVIEW_CACHE:
                    yield f"data: {json.dumps({'status': 'progress', 'message': f'Skipping {filename} (Already reviewed)'})}\n\n"
                    
                    # Instantly return the cached issues
                    cached_issues = REVIEW_CACHE[file_hash]
                    yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': cached_issues})}\n\n"
                    continue # Move straight to the next file!
                # ------------------------

                yield f"data: {json.dumps({'status': 'progress', 'message': f'Analyzing {filename} ({index+1}/{len(changed_files)})...'})}\n\n"
                
                try:
                    ai_json_string = analyze_single_file_with_ai(tree, file_data)
                    result = json.loads(ai_json_string)
                    file_issues = result.get("issues", [])
                    
                    # --- NEW: SAVE TO CACHE ---
                    REVIEW_CACHE[file_hash] = file_issues
                    
                    yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': file_issues})}\n\n"
                    
                    # --- NEW: PACING ---
                    # Mandatory 2-second break between successful AI calls to respect API limits
                    time.sleep(2)
                    
                except Exception as ai_e:
                    yield f"data: {json.dumps({'status': 'error', 'filename': filename, 'message': str(ai_e)})}\n\n"

            yield f"data: {json.dumps({'status': 'done', 'message': 'Review complete!'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'status': 'fatal_error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")