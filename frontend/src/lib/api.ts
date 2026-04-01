// frontend/src/lib/api.ts

// --- INPUT SCHEMA ---
export interface ReviewParams {
  provider: 'github' | 'bitbucket';
  repo_owner: string;
  repo_name: string;
  pr_number: number; // or number
  token: string;
  target_file?: string; // NEW: Optional target file
}

// --- OUTPUT SCHEMAS ---
export interface ComplexityAnalysis {
  current: string;
  improved: string;
  notes: string;
}

export interface ReviewIssue {
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Perf' | 'Security' | 'Design' | 'Maintainability' | 'Logic'; 
  file_path: string;
  line_number?: number;
  title: string;
  explanation: string;
  impact: string; 
  suggested_fix: string;
  trade_offs: string;
  complexity_analysis?: ComplexityAnalysis | null; 
  code_diff?: string;
}

export interface AnalyzedFile {
  filename: string;
  issueCount: number;
}

export interface ReviewResponse {
  issues: ReviewIssue[];
  analyzedFiles?: AnalyzedFile[]; 
}

// --- API FUNCTION ---
// frontend/src/lib/api.ts
// ... (Keep your interfaces exactly the same at the top) ...

export const analyzePullRequest = async (
  params: ReviewParams,
  onProgress?: (newIssues: ReviewIssue[], message: string, newFile?: AnalyzedFile) => void 
): Promise<ReviewResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  const response = await fetch(`${baseUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(errorData || `API Error: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return await response.json();
  }

  if (contentType.includes('text/event-stream')) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Stream not supported by browser");

    const decoder = new TextDecoder('utf-8');
    let done = false;
    let allIssues: ReviewIssue[] = [];
    let allAnalyzedFiles: AnalyzedFile[] = [];
    
    // NEW: The string buffer to hold fragmented network chunks
    let buffer = ''; 

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';

        for (const message of messages) {
          if (message.startsWith('data:')) {
            const dataStr = message.replace(/^data:\s*/, '').trim();
            if (!dataStr) continue;

            // 1. Parse the JSON safely
            let data;
            try {
              data = JSON.parse(dataStr);
            } catch (e) {
               console.error("Skipping fragmented network chunk...");
               continue; // Skip to next message if JSON is incomplete
            }

            // 2. Handle the data OUTSIDE the catch block!
            if (data.status === 'file_completed') {
              const newIssues = data.issues || [];
              allIssues = [...allIssues, ...newIssues];
              
              const newFile: AnalyzedFile = {
                filename: data.filename,
                issueCount: newIssues.length
              };
              allAnalyzedFiles.push(newFile);

              if (onProgress) onProgress(newIssues, `Analyzed ${data.filename}`, newFile);
            } 
            else if (data.status === 'progress' || data.status === 'info') {
              if (onProgress) onProgress([], data.message);
            }
            else if (data.status === 'error') {
              if (onProgress) onProgress([], `Error: ${data.message}`);
            }
            // CRITICAL FIX: Properly throw fatal errors so the UI catches them!
            else if (data.status === 'fatal_error') {
              throw new Error(data.message);
            }
          }
        }
      }
    }

    return { issues: allIssues, analyzedFiles: allAnalyzedFiles };
  }

  throw new Error("Unsupported response format from server");
};