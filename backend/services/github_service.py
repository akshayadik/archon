# backend/services/github_service.py
import requests
from fastapi import HTTPException

def fetch_pr_diff(owner: str, repo: str, pr_num: int, token: str) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_num}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3.diff" # Crucial: Asks for the raw diff, not JSON
    }
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch PR diff. Verify token and PR details.")
    
    return response.text

def fetch_repo_tree(owner: str, repo: str, token: str) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        tree = response.json().get("tree", [])
        # Return a flat list of file paths to give the AI architectural context
        paths = [item["path"] for item in tree if item["type"] == "blob"]
        return "\n".join(paths)
    
    return "Could not fetch repository tree. Proceeding with diff only."