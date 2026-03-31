// frontend/src/components/InputForm.tsx
"use client";

import React, { useState } from 'react';
import { Key, Loader2, Link as LinkIcon, AlertCircle} from 'lucide-react';
// IMPORT the new AnalyzedFile interface
import { analyzePullRequest, ReviewResponse, ReviewParams, ReviewIssue, AnalyzedFile } from '../lib/api';

interface InputFormProps {
  onStart: () => void;
  // UPDATE the signature here
  onProgress: (newIssues: ReviewIssue[], message: string, newFile?: AnalyzedFile) => void;
  onSuccess: (data: ReviewResponse) => void;
  onError: (message: string) => void;
}

export default function InputForm({ onStart, onProgress, onSuccess, onError }: InputFormProps) {
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState<'github' | 'bitbucket'>('github');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [token, setToken] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pastedUrl = e.target.value;
    setUrl(pastedUrl);

    try {
      const urlObj = new URL(pastedUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (urlObj.hostname.includes('github') && pathParts.length >= 4 && pathParts[2] === 'pull') {
        setProvider('github');
        setRepoOwner(pathParts[0]);
        setRepoName(pathParts[1]);
        setPrNumber(pathParts[3]);
      }
      else if (urlObj.hostname.includes('bitbucket') && pathParts.length >= 4 && pathParts[2] === 'pull-requests') {
        setProvider('bitbucket');
        setRepoOwner(pathParts[0]);
        setRepoName(pathParts[1]);
        setPrNumber(pathParts[3]);
      }
    } catch { }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!repoOwner || !repoName || !prNumber) {
      setLocalError("Please fill out the repository and PR details.");
      return;
    }
    if (!token.trim()) {
      setLocalError("Please provide an access token.");
      return;
    }

    setIsLoading(true);
    // Trigger the UI to shift immediately to the dashboard
    onStart(); 

    try {
      const payload: ReviewParams = { 
        provider,
        repo_owner: repoOwner.trim(),
        repo_name: repoName.trim(),
        pr_number: parseInt(prNumber, 10),
        token: token.trim() 
      };
      
      const response = await analyzePullRequest(payload, onProgress);
      onSuccess(response);
    } catch (err: any) {
      const apiError = err.response?.data?.detail || err.message || "An unexpected error occurred.";
      setLocalError(`Analysis failed: ${apiError}`);
      onError(`Analysis failed: ${apiError}`); // Send error up to Dashboard
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
      
      {localError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-red-700 text-sm font-medium">{localError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Smart Paste (Optional)</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LinkIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="url"
            value={url}
            onChange={handleUrlPaste}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400 bg-gray-50"
            placeholder="Paste a PR URL to auto-fill the fields below..."
          />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'github' | 'bitbucket')}
              className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="github">GitHub</option>
              <option value="bitbucket">Bitbucket</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">PR Number</label>
            <input
              type="number"
              required
              min="1"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. 42"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Workspace / Owner</label>
            <input
              type="text"
              required
              value={repoOwner}
              onChange={(e) => setRepoOwner(e.target.value)}
              className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. abcdevelopers"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Repository Name</label>
            <input
              type="text"
              required
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="block w-full py-2.5 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="e.g. hellp-world"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Access Token</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Key className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="password"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
            placeholder="Bearer token or username:app_password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-bold text-white transition-all mt-4
          ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Connecting to Repository...
          </>
        ) : (
          'Review Architecture'
        )}
      </button>
    </form>
  );
}