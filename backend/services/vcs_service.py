import requests
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
def _fetch_github_changed_files(owner: str, repo: str, pr_num: int, token: str) -> List[Dict[str, str]]:
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_num}/files"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"}
    response = requests.get(url, headers=headers)
    
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
                raw_resp = requests.get(raw_url, headers={"Authorization": f"Bearer {token}"})
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

    # 1. Get the list of files
    stat_response = requests.get(stat_url, auth=auth, headers=headers)
    if stat_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Bitbucket API Error fetching files.")
        
    # 2. Get the full PR diff (Bitbucket doesn't give isolated file patches easily)
    diff_url = f"https://api.bitbucket.org/2.0/repositories/{owner}/{repo}/pullrequests/{pr_num}/diff"
    diff_response = requests.get(diff_url, auth=auth, headers=headers, allow_redirects=True)
    full_diff = diff_response.text if diff_response.status_code in [200, 201, 202, 204] else "Diff unavailable."

    files_data = []
    for stat in stat_response.json().get("values", []):
        status = stat.get("status")
        if status in ["added", "modified"] and "new" in stat:
            filename = stat["new"].get("path")
            file_link = stat["new"].get("links", {}).get("self", {}).get("href")
            
            file_info = {
                "filename": filename,
                "patch": f"FULL PR DIFF (Find changes for {filename} here):\n{full_diff}", 
                "full_content": ""
            }
            
            if file_link:
                file_resp = requests.get(file_link, auth=auth, headers=headers)
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