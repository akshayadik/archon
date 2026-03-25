import os
from google import genai
from google.genai import types
from models.schemas import ReviewResponse
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# FIX: Return type is now strictly 'str'
def analyze_code_with_ai(repo_tree: str, diff_content: str) -> str:
    
    performance_instructions = """
    PERFORMANCE AUDIT CHECKLIST:
    1. Database N+1 Queries: Look for loops that execute database calls or API requests inside them.
    2. Memory Bloat: Identify instances where large datasets are loaded into memory (e.g., .findAll() without pagination).
    3. Blocking I/O: In async environments (Node/FastAPI), find synchronous file/network calls that block the event loop.
    4. Inefficient Iteration: Flag nested loops (O(n^2)) or redundant data transformations on large collections.
    5. Cache Opportunities: Suggest where expensive computations or repeated DB lookups could benefit from memoization or caching.
    """
    architecture_instruction = """
    ARCHITECTURE CHECKLIST
    Architecture: Identify layer violations and service boundary breaks using the provided Repository Context.
    Performance: Use the {performance_instructions} checklist to find N+1 queries, memory leaks, and O(n^2) bottlenecks.
    Security: Scan for hardcoded secrets, injection risks, and unsafe dependencies.
    """
    
    
    prompt = f"""
    You are an expert Principal Software Engineer conducting a deep architectural and code quality review.
    
    CONTEXT (Repository File Structure):
    {repo_tree}
    
    PULL REQUEST DIFF:
    {diff_content}
    
    INSTRUCTIONS:
    1. Analyze the diff thorugh three distinct lenses {architecture_instruction}.
    2. Filter out the 'Noise': Ignore indentation, naming nitpicks (unless they are misleading), and minor formatting. Focus strictly on Structural and Logical flaws.
    3. Use the Context to understand if a controller is directly accessing a database, or if service boundaries are being respected.
    4. Provide clear explanations and trade-offs for every issue.
    5. Use the following checklist to identify bottlenecks: {performance_instructions}
    6. For every 'Perf' issue, explain the Big O complexity impact if applicable.
    7. Suggest a fix that optimizes for speed or memory efficiency.
    8. Impact Assessment: For 'High' or 'Critical' issues, briefly state the risk of NOT fixing this (e.g., "This will cause an outage under peak load" or "This exposes PII to the public logs").
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReviewResponse,
                temperature=0.2,
            ),
        )
        
        # FIX: Handle the potential 'None' value from response.text
        if not response.text:
            raise ValueError("AI returned an empty response.")
            
        return response.text # This is guaranteed to be a JSON string now
        
    except Exception as e:
        raise Exception(f"AI Analysis failed: {str(e)}")