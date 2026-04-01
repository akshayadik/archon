import requests
import re
from fastapi import HTTPException
from typing import Tuple, Dict, List, Optional

def get_vcs_context(provider: str, owner: str, repo: str, pr_num: int, token: str) -> Tuple[List[Dict[str, str]], str]:
    """Returns a list of changed files and the repository tree for both GitHub and Bitbucket."""
    provider = provider.lower()
    
    if provider == "github":
        files = _fetch_github_changed_files(owner, repo, pr_num, token)
        tree = _fetch_github_tree(owner, repo, token)
        return files, tree
    elif provider == "bitbucket":
        files = _fetch_bitbucket_changed_files(owner, repo, pr_num, token)
        tree = _fetch_bitbucket_tree(owner, repo, token)
        return files, tree
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider. Use 'github' or 'bitbucket'.")

# --- GITHUB IMPLEMENTATION ---
# In backend/services/vcs_service.py

def _fetch_github_changed_files(owner: str, repo: str, pr_num: int, token: str) -> List[Dict[str, str]]:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_num}/files"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"}
    
    # NEW: Create a session to reuse the underlying TCP connection
    with requests.Session() as session:
        response = session.get(url, headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail=f"GitHub API Error: {response.text}")
            
        files_data = []
        for file in response.json():
            if file.get("status") in ["added", "modified"]:
                file_info = {
                    "filename": file.get("filename"),
                    "patch": file.get("patch", "No diff available."), 
                    "full_content": ""
                }
                raw_url = file.get("raw_url")
                if raw_url:
                    # UPDATED: Use the session here too!
                    raw_resp = session.get(raw_url, headers={"Authorization": f"Bearer {token}"})
                    if raw_resp.status_code == 200:
                        file_info["full_content"] = raw_resp.text
                files_data.append(file_info)
                
        return files_data

def _fetch_github_tree(owner: str, repo: str, token: str) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return "\n".join([item["path"] for item in response.json().get("tree", []) if item["type"] == "blob"])
    return "Could not fetch GitHub tree."

# --- BITBUCKET IMPLEMENTATION ---
def _fetch_bitbucket_changed_files(owner: str, repo: str, pr_num: int, token: str) -> List[Dict[str, str]]:
    stat_url = f"https://api.bitbucket.org/2.0/repositories/{owner}/{repo}/pullrequests/{pr_num}/diffstat"
    
    auth: Optional[Tuple[str, str]] = None
    headers: Dict[str, str] = {}
    if ":" in token:
        username, app_password = token.split(":", 1)
        auth = (username, app_password)
    else:
        headers = {"Authorization": f"Bearer {token}"}

    with requests.Session() as session:
        stat_response = session.get(stat_url, auth=auth, headers=headers)
        if stat_response.status_code != 200:
            # FIX: Include the actual text from Bitbucket so we know WHY it failed
            raise HTTPException(status_code=400, detail=f"Bitbucket API Error: {stat_response.text}")
            
        diff_url = f"https://api.bitbucket.org/2.0/repositories/{owner}/{repo}/pullrequests/{pr_num}/diff"
        diff_response = session.get(diff_url, auth=auth, headers=headers, allow_redirects=True)
        # FIX: Also capture diff errors just in case
        if diff_response.status_code not in [200, 201, 202, 204]:
            raise HTTPException(status_code=400, detail=f"Bitbucket Diff Error: {diff_response.text}")
            
        full_diff = diff_response.text

        # --- NEW: Chop the giant PR diff into individual file diffs ---
        file_patches = {}
        if full_diff:
            # Split the text every time a new file diff starts
            chunks = re.split(r'(^diff --git a/.* b/.*$)', full_diff, flags=re.MULTILINE)
            current_file = None
            
            for chunk in chunks:
                if chunk.startswith("diff --git"):
                    # Extract the actual filename from the 'b/...' part
                    match = re.search(r' b/(.*)$', chunk)
                    if match:
                        current_file = match.group(1).strip()
                        file_patches[current_file] = chunk
                elif current_file:
                    file_patches[current_file] += chunk
        # -------------------------------------------------------------

        files_data = []
        for stat in stat_response.json().get("values", []):
            status = stat.get("status")
            if status in ["added", "modified"] and "new" in stat:
                filename = stat["new"].get("path")
                file_link = stat["new"].get("links", {}).get("self", {}).get("href")
                
                # UPDATED: We now fetch ONLY the isolated patch for this specific file
                isolated_patch = file_patches.get(filename, "No diff available.")
                
                file_info = {
                    "filename": filename,
                    "patch": isolated_patch, 
                    "full_content": ""
                }
                
                if file_link:
                    file_resp = session.get(file_link, auth=auth, headers=headers)
                    if file_resp.status_code == 200:
                        file_info["full_content"] = file_resp.text
                        
                files_data.append(file_info)
                
        return files_data

def _fetch_bitbucket_tree(owner: str, repo: str, token: str) -> str:
    url = f"https://api.bitbucket.org/2.0/repositories/{owner}/{repo}/src/HEAD/?max_depth=3"
    auth = None
    headers = {}
    if ":" in token:
        username, app_password = token.split(":", 1)
        auth = (username, app_password)
    else:
        headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, auth=auth, headers=headers)
    if response.status_code in [200, 202]:
        return "\n".join([item["path"] for item in response.json().get("values", [])])
    return "Could not fetch Bitbucket tree."