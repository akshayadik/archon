// frontend/src/lib/api.ts

// frontend/src/lib/api.ts

// NEW Interface
export interface ComplexityAnalysis {
  current: string;
  improved: string;
  notes: string;
}

export interface ReviewIssue {
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Perf' | 'Security' | 'Design' | 'Maintainability' | 'Logic'; // Added Logic
  file_path: string;
  line_number?: number;
  title: string;
  explanation: string;
  impact: string; // NEW
  suggested_fix: string;
  trade_offs: string;
  complexity_analysis?: ComplexityAnalysis | null; // NEW
  code_diff?: string;
}

// NEW: Track file-level statistics
export interface AnalyzedFile {
  filename: string;
  issueCount: number;
}

export interface ReviewResponse {
  issues: ReviewIssue[];
  analyzedFiles?: AnalyzedFile[]; // NEW: Added to response
}

export const analyzePullRequest = async (
  params: ReviewParams,
  // NEW: Updated signature to pass the newly analyzed file
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
    let allAnalyzedFiles: AnalyzedFile[] = []; // Track all files

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataStr = line.replace('data:', '').trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.status === 'file_completed') {
                const newIssues = data.issues || [];
                allIssues = [...allIssues, ...newIssues];
                
                // Create a record for this specific file
                const newFile: AnalyzedFile = {
                  filename: data.filename,
                  issueCount: newIssues.length
                };
                allAnalyzedFiles.push(newFile);

                // Pass both the issues and the file info to the UI
                if (onProgress) onProgress(newIssues, `Analyzed ${data.filename}`, newFile);
              } 
              else if (data.status === 'progress' || data.status === 'info') {
                if (onProgress) onProgress([], data.message);
              }
              else if (data.status === 'error' || data.status === 'fatal_error') {
                if (onProgress) onProgress([], `Error: ${data.message}`);
                if (data.status === 'fatal_error') throw new Error(data.message);
              }
            } catch (e) {
              // Ignore partial JSON parsing errors
            }
          }
        }
      }
    }

    return { issues: allIssues, analyzedFiles: allAnalyzedFiles };
  }

  throw new Error("Unsupported response format from server");
};