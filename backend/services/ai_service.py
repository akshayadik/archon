import os
from google import genai
from google.genai import types
from models.schemas import ReviewResponse
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def analyze_single_file_with_ai(repo_tree: str, file_data: dict) -> str:
    filename = file_data.get("filename")
    patch = file_data.get("patch")
    full_content = file_data.get("full_content")
    
    prompt = f"""
    You are an expert Principal Software Engineer conducting a deep architectural and code quality review.
    
    CONTEXT (Repository File Structure):
    {repo_tree}
    
    FILE UNDER REVIEW: {filename}
    
    PULL REQUEST DIFF (Changes made to this file):
    {patch}
    
    FULL FILE CONTENT (For context outside the diff):
    {full_content}
    
    INSTRUCTIONS:
    1. Analyze this specific file for Structural, Logical, Performance, and Security flaws.
    2. Filter out the 'Noise': Ignore indentation, naming nitpicks, and minor formatting. Focus strictly on flaws.
    3. Do NOT just review the diff lines. Use the FULL FILE CONTENT to identify issues like N+1 queries, missing validations, blocking I/O, or layer violations.
    4. Provide clear explanations, Big O trade-offs (if performance related), and suggest a fix for every issue.
    5. CRITICAL: If the code is structurally sound and has no flaws, simply return an empty list for "issues". Do NOT invent issues.
    6. Provide clear explanations and trade-offs for every issue.
    7. For every 'Perf' issue, explain the Big O complexity impact if applicable.
    8. Suggest a fix that optimizes for speed or memory efficiency.
    9. Impact Assessment: For 'High' or 'Critical' issues, briefly state the risk of NOT fixing this.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReviewResponse,
                temperature=0.2, # Keep low for analytical tasks
            ),
        )
        
        if not response.text:
            raise ValueError("AI returned an empty response.")
            
        return response.text 
        
    except Exception as e:
        raise Exception(f"AI Analysis failed for {filename}: {str(e)}")