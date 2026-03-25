# backend/test_gemini.py
import os
from google import genai
from dotenv import load_dotenv

# Load the API key from your .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR: GEMINI_API_KEY not found in .env file.")
    exit(1)

print(f"Loaded API Key starting with: {api_key[:10]}...")
client = genai.Client(api_key=api_key)

try:
    print("📡 Sending a tiny request to Google...")
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents='Please reply with exactly: "Hello World, the connection is stable!"'
    )
    print("✅ SUCCESS! The AI says:", response.text)
except Exception as e:
    print("❌ FAILED! The error is:", str(e))