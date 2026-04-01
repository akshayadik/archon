# backend/models/schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional

class ReviewRequest(BaseModel):
    provider: str = Field(description="Must be 'github' or 'bitbucket'", default="github")
    repo_owner: str
    repo_name: str
    pr_number: int
    token: str
    target_file: Optional[str] = Field(default=None, description="Optional specific file to review") # NEW

# NEW: Create a nested model for the complexity analysis
class ComplexityAnalysis(BaseModel):
    current: str
    improved: str
    notes: str

class ReviewIssue(BaseModel):
    severity: str = Field(description="Must be one of: Low, Medium, High, Critical")
    # Updated category to match your prompt
    category: str = Field(description="Must be one of: Perf, Security, Design, Maintainability, Logic")
    file_path: str 
    line_number: Optional[int] 
    title: str 
    explanation: str 
    impact: str = Field(description="Runtime, scalability, security, or maintainability impact") # NEW
    suggested_fix: str 
    trade_offs: str 
    complexity_analysis: Optional[ComplexityAnalysis] = None # NEW (Optional because prompt says use null if not performance)
    code_diff: Optional[str] 

class ReviewResponse(BaseModel):
    issues: List[ReviewIssue]