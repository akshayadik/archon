// frontend/src/components/InputForm.tsx
"use client";

import React, { useState } from 'react';
import { Key, Loader2, Link as LinkIcon, AlertCircle} from 'lucide-react';
import { analyzePullRequest, ReviewResponse, ReviewParams } from '../lib/api';

interface InputFormProps {
  onSuccess: (data: ReviewResponse) => void;
}

export default function InputForm({ onSuccess }: InputFormProps) {
  // Form States
  const [url, setUrl] = useState('');
  const [provider, setProvider] = useState<'github' | 'bitbucket'>('github');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [token, setToken] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart URL Parser to Auto-Fill the fields
  const handleUrlPaste = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pastedUrl = e.target.value;
    setUrl(pastedUrl);

    try {
      const urlObj = new URL(pastedUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // GitHub: github.com/owner/repo/pull/123
      if (urlObj.hostname.includes('github') && pathParts.length >= 4 && pathParts[2] === 'pull') {
        setProvider('github');
        setRepoOwner(pathParts[0]);
        setRepoName(pathParts[1]);
        setPrNumber(pathParts[3]);
      }
      
      // Bitbucket: bitbucket.org/owner/repo/pull-requests/123
      else if (urlObj.hostname.includes('bitbucket') && pathParts.length >= 4 && pathParts[2] === 'pull-requests') {
        setProvider('bitbucket');
        setRepoOwner(pathParts[0]);
        setRepoName(pathParts[1]);
        setPrNumber(pathParts[3]);
      }
    } catch {
      // If it's not a valid URL yet, just do nothing and let them type manually
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate manual inputs
    if (!repoOwner || !repoName || !prNumber) {
      setError("Please fill out the repository and PR details.");
      return;
    }
    if (!token.trim()) {
      setError("Please provide an access token.");
      return;
    }

    setIsLoading(true);

    try {
      const payload: ReviewParams = { 
        provider,
        repo_owner: repoOwner.trim(),
        repo_name: repoName.trim(),
        pr_number: parseInt(prNumber, 10),
        token: token.trim() 
      };
      
      const response = await analyzePullRequest(payload);
      onSuccess(response);
    } catch (err: any) {
      const apiError = err.response?.data?.detail || err.message || "An unexpected error occurred.";
      setError(`Analysis failed: ${apiError}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6">
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Magic URL Input */}
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
          
          {/* Provider Selection */}
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

          {/* PR Number */}
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

          {/* Repo Owner */}
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

          {/* Repo Name */}
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

      {/* Token Input */}
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
            Analyzing Architecture...
          </>
        ) : (
          'Review Architecture'
        )}
      </button>
    </form>
  );
}