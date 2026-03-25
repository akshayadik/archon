import requests
from fastapi import HTTPException
from typing import Optional, Tuple, Dict, Any

def get_vcs_context(provider: str, owner: str, repo: str, pr_num: int, token: str) -> tuple[str, str]:
    """Routes the request to the correct Version Control System provider."""
    provider = provider.lower()
    
    if provider == "github":
        diff = _fetch_github_diff(owner, repo, pr_num, token)
        tree = _fetch_github_tree(owner, repo, token)
        return diff, tree
    elif provider == "bitbucket":
        diff = _fetch_bitbucket_diff(owner, repo, pr_num, token)
        tree = _fetch_bitbucket_tree(owner, repo, token)
        return diff, tree
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider. Use 'github' or 'bitbucket'.")

# --- GITHUB IMPLEMENTATION ---

def _fetch_github_diff(owner: str, repo: str, pr_num: int, token: str) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_num}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3.diff"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"GitHub API Error: {response.text}")
    return response.text

def _fetch_github_tree(owner: str, repo: str, token: str) -> str:
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return "\n".join([item["path"] for item in response.json().get("tree", []) if item["type"] == "blob"])
    return "Could not fetch GitHub tree."

# --- BITBUCKET IMPLEMENTATION ---

def _fetch_bitbucket_diff(owner: str, repo: str, pr_num: int, token: str) -> str:
    url = f"https://api.bitbucket.org/2.0/repositories/{owner}/{repo}/pullrequests/{pr_num}/diff"
    
    # Explicitly define variables to satisfy the type checker
    auth: Optional[Tuple[str, str]] = None
    headers: Dict[str, str] = {}

    if ":" in token:
        username, app_password = token.split(":", 1)
        auth = (username, app_password)
    else:
        headers = {"Authorization": f"Bearer {token}"}

    # Pass parameters explicitly
    response = requests.get(
        url, 
        auth=auth, 
        headers=headers, 
        allow_redirects=True
    )
    
    if response.status_code not in [200, 201, 202, 204]:
        error_msg = f"Bitbucket diff failed. Status: {response.status_code}"
        raise HTTPException(status_code=400, detail=error_msg)
        
    return response.text

def _fetch_bitbucket_tree(owner: str, repo: str, token: str) -> str:
    url = f"https://api.bitbucket.org/2.0/repositories/{owner}/{repo}/src/HEAD/?max_depth=3"
    
    auth: Optional[Tuple[str, str]] = None
    headers: Dict[str, str] = {}

    if ":" in token:
        username, app_password = token.split(":", 1)
        auth = (username, app_password)
    else:
        headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, auth=auth, headers=headers)
    
    if response.status_code not in [200, 202]:
        return "Could not fetch Bitbucket tree."
        
    values = response.json().get("values", [])
    return "\n".join([item["path"] for item in values])