# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json

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

@app.post("/api/analyze")
def analyze_pr(request: ReviewRequest):
    
    # We define a generator function to stream data back chunk by chunk
    def event_stream():
        try:
            # 1. Fetch live context
            yield f"data: {json.dumps({'status': 'info', 'message': 'Fetching repository context...'})}\n\n"
            changed_files, tree = get_vcs_context(
                provider=request.provider,
                owner=request.repo_owner,
                repo=request.repo_name,
                pr_num=request.pr_number,
                token=request.token
            )
            
            yield f"data: {json.dumps({'status': 'info', 'message': f'Found {len(changed_files)} files to review.'})}\n\n"
            
            # 2. Iterate and analyze EACH file individually, streaming the results instantly
            for index, file_data in enumerate(changed_files):
                filename = file_data.get("filename")
                yield f"data: {json.dumps({'status': 'progress', 'message': f'Analyzing {filename} ({index+1}/{len(changed_files)})...'})}\n\n"
                
                try:
                    ai_json_string = analyze_single_file_with_ai(tree, file_data)
                    result = json.loads(ai_json_string)
                    file_issues = result.get("issues", [])
                    
                    # Send the completed file review back immediately
                    yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': file_issues})}\n\n"
                    
                except Exception as ai_e:
                    yield f"data: {json.dumps({'status': 'error', 'filename': filename, 'message': str(ai_e)})}\n\n"

            # 3. Tell the frontend we are completely done
            yield f"data: {json.dumps({'status': 'done', 'message': 'Review complete!'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'status': 'fatal_error', 'message': str(e)})}\n\n"

    # Return the stream! Media type text/event-stream prevents Vercel from timing out
    return StreamingResponse(event_stream(), media_type="text/event-stream")