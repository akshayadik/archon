# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import json
import time
import hashlib
import os # <-- NEW: Add this import

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

REVIEW_CACHE = {}

def get_file_hash(repo_name: str, pr_number: int, filename: str, patch: str) -> str:
    signature = f"{repo_name}_{pr_number}_{filename}_{patch}"
    return hashlib.md5(signature.encode()).hexdigest()

@app.post("/api/analyze")
def analyze_pr(request: ReviewRequest):
    
    def event_stream():
        print(f"\n🚀 --- STARTING PR REVIEW: {request.repo_owner}/{request.repo_name} PR #{request.pr_number} ---")
        try:
            yield f"data: {json.dumps({'status': 'info', 'message': 'Fetching repository context...'})}\n\n"
            changed_files, tree = get_vcs_context(
                provider=request.provider,
                owner=request.repo_owner,
                repo=request.repo_name,
                pr_num=request.pr_number,
                token=request.token
            )
            
            # --- NEW: Filter by specific file if requested ---
            if request.target_file and request.target_file.strip():
                # Split the input by commas, remove extra spaces, and convert to lowercase
                search_terms = [term.strip().lower() for term in request.target_file.split(',') if term.strip()]
                
                # Keep the file if ANY of the search terms match its filename
                changed_files = [
                    f for f in changed_files 
                    if any(term in f.get("filename", "").lower() for term in search_terms)
                ]
                
                if not changed_files:
                    msg = f"No files matched your search: {request.target_file}"
                    yield f"data: {json.dumps({'status': 'info', 'message': msg})}\n\n"
                    yield f"data: {json.dumps({'status': 'done', 'message': 'Review complete!'})}\n\n"
                    return # Exit early since there's nothing to review
            
            total_files = len(changed_files)
            print(f"📦 Successfully fetched {total_files} files to review.")
            yield f"data: {json.dumps({'status': 'info', 'message': f'Found {total_files} files to review.'})}\n\n"

            processed_count = 0
            empty_response_count = 0
            issues_found_count = 0
            
            # --- NEW: Smart Filtering Configuration ---
            IGNORED_EXTENSIONS = {'.md', '.txt', '.csv', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.jar'}
            IGNORED_FILES = {'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'CHANGELOG.md'}
            MAX_CHAR_LIMIT = 35000 # ~8,500 tokens, safely under Groq's 12k TPM limit
            
            for index, file_data in enumerate(changed_files):
                filename = file_data.get("filename")
                patch = file_data.get("patch", "")
                full_content = file_data.get("full_content", "")
                processed_count += 1
                
                print(f"⏳ [{processed_count}/{total_files}] Processing: {filename}...")
                
                # --- NEW: FILTER 1 - Skip Documentation & Lock Files ---
                _, ext = os.path.splitext(filename)
                base_name = os.path.basename(filename)
                
                if ext.lower() in IGNORED_EXTENSIONS or base_name in IGNORED_FILES:
                    print(f"   ⏭️ SKIPPED: Non-code file ({ext or base_name}).")
                    empty_response_count += 1
                    yield f"data: {json.dumps({'status': 'progress', 'message': f'Skipping {filename} (Non-code file)'})}\n\n"
                    # Return an empty issue list so the UI still shows it in the Audit Trail as "No Changes Needed"
                    yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': []})}\n\n"
                    continue

                # --- NEW: FILTER 2 - Hard Size Limit for Free Tier ---
                total_chars = len(patch) + len(full_content)
                if total_chars > MAX_CHAR_LIMIT:
                    # Check if just the diff is small enough to review
                    if len(patch) < MAX_CHAR_LIMIT:
                        print(f"   ⚠️ WARNING: File too large ({total_chars} chars). Falling back to DIFF ONLY.")
                        # Overwrite the full content with a warning for the AI
                        file_data["full_content"] = "FILE TOO LARGE. FULL CONTEXT OMITTED. YOU MUST REVIEW THE DIFF ONLY."
                        yield f"data: {json.dumps({'status': 'progress', 'message': f'Analyzing diff only for {filename} (File too large)'})}\n\n"
                    else:
                        # If even the diff is massive, we must skip it
                        print(f"   ⏭️ SKIPPED: Even the diff is too large ({len(patch)} chars).")
                        empty_response_count += 1
                        yield f"data: {json.dumps({'status': 'progress', 'message': f'Skipping {filename} (Diff too large for free tier)'})}\n\n"
                        yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': []})}\n\n"
                        continue
                
                # --- PROCEED WITH AI REVIEW ---
                file_hash = get_file_hash(request.repo_name, request.pr_number, filename, patch)
                
                if file_hash in REVIEW_CACHE:
                    cached_issues = REVIEW_CACHE[file_hash]
                    issue_len = len(cached_issues)
                    print(f"   ⚡ CACHE HIT: Returned {issue_len} issues instantly.")
                    if issue_len == 0:
                        empty_response_count += 1
                    else:
                        issues_found_count += issue_len
                        
                    yield f"data: {json.dumps({'status': 'progress', 'message': f'Skipping {filename} (Already reviewed)'})}\n\n"
                    yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': cached_issues})}\n\n"
                    continue

                yield f"data: {json.dumps({'status': 'progress', 'message': f'Analyzing {filename} ({index+1}/{total_files})...'})}\n\n"
                
                try:
                    ai_json_string = analyze_single_file_with_ai(tree, file_data)
                    result = json.loads(ai_json_string)
                    file_issues = result.get("issues", [])
                    issue_len = len(file_issues)
                    
                    if issue_len == 0:
                        print(f"   ✅ AI RESULT: 0 issues found (Perfect Code).")
                        empty_response_count += 1
                    else:
                        print(f"   ⚠️ AI RESULT: {issue_len} issues found.")
                        issues_found_count += issue_len
                        
                    REVIEW_CACHE[file_hash] = file_issues
                    
                    yield f"data: {json.dumps({'status': 'file_completed', 'filename': filename, 'issues': file_issues})}\n\n"
                    time.sleep(2) 
                    
                except Exception as ai_e:
                    print(f"   ❌ ERROR analyzing {filename}: {str(ai_e)}")
                    yield f"data: {json.dumps({'status': 'error', 'filename': filename, 'message': str(ai_e)})}\n\n"

            print("\n🏁 --- PR REVIEW COMPLETE ---")
            print(f"📊 Total Files Processed: {processed_count}")
            print(f"🎯 Files with NO Issues (or skipped): {empty_response_count}")
            print(f"🐛 Total Issues Found: {issues_found_count}")
            print("------------------------------------------\n")
            
            yield f"data: {json.dumps({'status': 'done', 'message': 'Review complete!'})}\n\n"

        except Exception as e:
            print(f"\n💥 FATAL ERROR: {str(e)}\n")
            yield f"data: {json.dumps({'status': 'fatal_error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")