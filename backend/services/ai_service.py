import os
import time
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

# Initialize the Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Inside backend/services/ai_service.py

def analyze_single_file_with_ai(repo_tree: str, file_data: dict) -> str:
    filename = file_data.get("filename")
    patch = file_data.get("patch")
    full_content = file_data.get("full_content")
    
    # YOUR NEW PROMPT
    prompt = f"""
    You are an expert senior software architect and performance engineer.

    Your task is to perform a deep, signal-focused code review of the provided file.

    CONTEXT (Repository File Structure):
    {repo_tree}

    FILE UNDER REVIEW: {filename}

    PULL REQUEST DIFF (Changes made to this file):
    {patch}

    FULL FILE CONTENT (For context outside the diff):
    {full_content}

    ### REVIEW OBJECTIVES
    Analyze the FULL FILE CONTENT (not just diffs) for the following categories:
    1. Structural & Architectural Issues
    - Layer violations, tight coupling, poor separation of concerns
    - Improper abstractions, god classes/functions

    2. Logical Correctness
    - Edge case failures, incorrect assumptions, missing validations
    - Error handling gaps

    3. Performance & Complexity
    - Time and space complexity (Big-O)
    - Redundant computations, inefficient loops, unnecessary allocations
    - N+1 queries, blocking I/O, excessive DB/API calls
    - Memory leaks or unbounded growth patterns

    4. Cyclomatic Complexity
    - Overly complex functions (high branching, nested logic)
    - Identify candidates for refactoring

    5. Security Risks
    - Injection vulnerabilities, unsafe deserialization
    - Missing input sanitization or auth checks
    - Sensitive data exposure

    ---

    ### STRICT REVIEW RULES
    - IGNORE: formatting, indentation, naming conventions, stylistic preferences
    - DO NOT invent issues — only report real, evidence-based problems
    - If FULL FILE CONTENT is provided, use it to find broader architectural flaws. If it says "OMITTED", rely STRICTLY on the PULL REQUEST DIFF to find flaws in the new logic.
    - PRIORITIZE high-impact issues over trivial ones
    - Each issue must be actionable and technically precise

    ---

    ### OUTPUT REQUIREMENTS (CRITICAL)
    You MUST return ONLY valid JSON. No explanations outside JSON.

    Schema:
    {{
    "issues": [
        {{
        "severity": "Low|Medium|High|Critical",
        "category": "Perf|Security|Design|Maintainability|Logic",
        "file_path": "<exact file path>",
        "line_number": <integer or null>,
        "title": "<short, precise issue title>",
        "explanation": "<root cause + why it matters>",
        "impact": "<runtime, scalability, security, or maintainability impact>",
        "suggested_fix": "<clear, actionable fix>",
        "trade_offs": "<what improves vs what it costs>",
        "complexity_analysis": {{
            "current": "<Big-O>",
            "improved": "<Big-O after fix>",
            "notes": "<brief reasoning>"
        }},
        "code_diff": "<unified diff format showing fix>"
        }}
    ]
    }}

    ---

    ### OUTPUT RULES
    - If NO issues found, return: {{ "issues": [] }}
    - "line_number" must point to the most relevant line
    - "code_diff" must be minimal and focused (do not rewrite entire file)
    - "complexity_analysis" is REQUIRED for performance-related issues only, otherwise use null

    ---

    ### REVIEW PRIORITY ORDER
    1. Critical security flaws
    2. Performance bottlenecks (O(n²), blocking I/O, N+1)
    3. Structural/design issues
    4. Logical correctness
    5. Maintainability (only if high impact)

    ---

    Now analyze the provided file.
    """
    # Keep our Exponential Backoff for Groq's rate limits
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile", # The recommended, highly-capable model
                messages=[
                    {"role": "system", "content": "You are a senior code reviewer. You must always output valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                # Force Groq to return a parsable JSON object
                response_format={"type": "json_object"},
                temperature=0.2, 
            )
            
            result_text = response.choices[0].message.content
            
            if not result_text:
                raise ValueError("Groq returned an empty response.")
                
            return result_text 
            
        except Exception as e:
            error_str = str(e).lower()
            
            # UPDATED: Catch Rate Limits, Server Overloads, AND Network Connection Drops
            network_errors = ["429", "too many requests", "503", "connection reset", "connection aborted", "timeout", "104", "peer"]
            
            if any(err in error_str for err in network_errors):
                if attempt < max_retries - 1:
                    sleep_time = (2 ** attempt) * 4 
                    print(f"⚠️ Network/Rate limit hiccup on {filename} ({error_str}). Retrying in {sleep_time}s...")
                    time.sleep(sleep_time)
                    continue
            
            # If it's a different error, or we ran out of retries, fail the file
            raise Exception(f"AI Analysis failed for {filename}: {str(e)}")