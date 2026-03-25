# backend/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional

# --- Input Schema (From UI to Backend) ---
class ReviewRequest(BaseModel):
    provider: str = Field(description="Must be 'github' or 'bitbucket'", default="github")
    repo_owner: str
    repo_name: str
    pr_number: int
    token: str

# --- Output Schema (From AI to UI) ---
class ReviewIssue(BaseModel):
    severity: str = Field(description="Must be one of: Low, Medium, High, Critical")
    category: str = Field(description="Must be one of: Perf, Security, Design, Maintainability")
    file_path: str = Field(description="The exact file path from the repository")
    line_number: Optional[int] = Field(description="The line number where the issue occurs, if applicable")
    title: str = Field(description="A short, descriptive title of the issue")
    explanation: str = Field(description="Detailed explanation of WHY this is an issue (e.g., layer violation, tight coupling)")
    suggested_fix: str = Field(description="Explanation of how to fix the issue")
    trade_offs: str = Field(description="The trade-offs of implementing this fix")
    code_diff: Optional[str] = Field(description="A markdown-formatted code diff showing the fix (using - and +)")

class ReviewResponse(BaseModel):
    issues: List[ReviewIssue]