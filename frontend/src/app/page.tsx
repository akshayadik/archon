// frontend/src/app/page.tsx
"use client";

import { useState } from "react";
import InputForm from "@/src/components/InputForm";
import ReviewCard from "@/src/components/ReviewCard";
import { ReviewResponse, ReviewIssue, AnalyzedFile } from "@/src/lib/api"; 
import { generateMarkdown } from "@/src/lib/exportUtils"; 
import { CheckCircle, Download, RefreshCw, Loader2, AlertCircle } from "lucide-react"; 

export default function Home() {
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownloadMarkdown = () => {
    if (!reviewData) return;
    const mdContent = generateMarkdown(reviewData);
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ai-review-report-${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStart = () => {
     setIsAnalyzing(true);
     setErrorMsg(null);
     // Initialize both arrays as empty so the dashboard can populate them live
     setReviewData({ issues: [], analyzedFiles: [] }); 
     setStatusMsg("Initializing analysis...");
  };

  // NEW: Append the new file to the analyzedFiles list
  const handleProgress = (newIssues: ReviewIssue[], message: string, newFile?: AnalyzedFile) => {
     setStatusMsg(message);
     setReviewData(prev => ({ 
         issues: [...(prev?.issues || []), ...newIssues],
         analyzedFiles: newFile ? [...(prev?.analyzedFiles || []), newFile] : (prev?.analyzedFiles || [])
     }));
  };

  const handleSuccess = (data: ReviewResponse) => {
     setIsAnalyzing(false);
     setStatusMsg("Analysis Complete");
     setReviewData(data);
  };

  const handleError = (message: string) => {
     setIsAnalyzing(false);
     setErrorMsg(message);
  };

  const handleReset = () => {
     setReviewData(null);
     setIsAnalyzing(false);
     setStatusMsg("");
     setErrorMsg(null);
  };

  const showDashboard = isAnalyzing || reviewData !== null;

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-8">
      
      {/* INPUT FORM LAYER */}
      <div className={`w-full max-w-2xl ${showDashboard ? 'hidden' : 'block'}`}>
         <div className="text-center mb-10 mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            ARCHON <span className="text-blue-600">The Code Reviewer</span>
          </h1>
          <p className="text-lg text-gray-600">
            Deep context architectural analysis for GitHub and Bitbucket. 
          </p>
        </div>
        <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-200">
          <InputForm 
             onStart={handleStart} 
             onProgress={handleProgress} 
             onSuccess={handleSuccess} 
             onError={handleError} 
          />
        </div>
      </div>

      {/* DASHBOARD LAYER */}
      {showDashboard && (
        <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div>
              {errorMsg ? (
                <h2 className="text-2xl font-bold text-red-600 flex items-center">
                  <AlertCircle className="w-7 h-7 mr-3" />
                  Analysis Failed
                </h2>
              ) : (
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  {isAnalyzing ? (
                    <Loader2 className="w-7 h-7 text-blue-500 mr-3 animate-spin" />
                  ) : (
                    <CheckCircle className="w-7 h-7 text-green-500 mr-3" />
                  )}
                  {isAnalyzing ? "Analyzing Architecture..." : "Analysis Complete"}
                </h2>
              )}
              
              <p className={`mt-1 ${errorMsg ? 'text-red-500' : 'text-gray-500'}`}>
                {errorMsg ? errorMsg : isAnalyzing ? statusMsg : (
                  <>Found <strong className="text-gray-900">{reviewData?.issues.length || 0}</strong> architectural improvements across <strong className="text-gray-900">{reviewData?.analyzedFiles?.length || 0}</strong> files.</>
                )}
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
              <button 
                onClick={handleDownloadMarkdown}
                disabled={isAnalyzing || !reviewData || reviewData.issues.length === 0}
                className={`flex items-center text-white font-semibold py-2 px-4 rounded shadow-sm transition-colors ${isAnalyzing || !reviewData || reviewData.issues.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}`}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report (.md)
              </button>
              
              <button 
                onClick={handleReset}
                disabled={isAnalyzing}
                className={`flex items-center text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded shadow-sm transition-colors ${isAnalyzing ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'bg-white hover:bg-gray-50'}`}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Review Another PR
              </button>
            </div>
          </div>

          {/* NEW: LIVE ANALYZED FILES SUMMARY */}
          {reviewData?.analyzedFiles && reviewData.analyzedFiles.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Audit Trail: Files Scanned</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reviewData.analyzedFiles.map((file, idx) => (
                  <li key={idx} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50 shadow-sm">
                    <span className="font-mono text-sm text-gray-700 truncate mr-4" title={file.filename}>
                      {file.filename.split('/').pop()} {/* Shows just the file name for cleaner UI */}
                    </span>
                    
                    {file.issueCount === 0 ? (
                      <span className="flex items-center whitespace-nowrap text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        No Changes Needed
                      </span>
                    ) : (
                      <span className="flex items-center whitespace-nowrap text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        {file.issueCount} {file.issueCount === 1 ? 'Issue' : 'Issues'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Detailed Issue Cards */}
          <div className="space-y-6">
            {reviewData?.issues.map((issue, index) => (
              <ReviewCard key={index} issue={issue} />
            ))}
          </div>

        </div>
      )}
    </main>
  );
}