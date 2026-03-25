// frontend/src/lib/api.ts
import axios from 'axios';

// The input format expected by our UI
export interface ReviewParams {
  provider: 'github' | 'bitbucket';
  repo_owner: string;
  repo_name: string;
  pr_number: number;
  token: string;
}

// The output format matching your Python Pydantic model
export interface ReviewIssue {
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  category: 'Perf' | 'Security' | 'Design' | 'Maintainability';
  file_path: string;
  line_number?: number;
  title: string;
  explanation: string;
  suggested_fix: string;
  trade_offs: string;
  code_diff?: string;
}

export interface ReviewResponse {
  issues: ReviewIssue[];
}

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api', // Your FastAPI backend
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzePullRequest = async (params: ReviewParams): Promise<ReviewResponse> => {
  const response = await apiClient.post<ReviewResponse>('/analyze', params);
  return response.data;
};