// frontend/src/app/page.tsx
"use client";

import { useState } from "react";
import InputForm from "@/src/components/InputForm";
import ReviewCard from "@/src/components/ReviewCard";
import { ReviewResponse } from "@/src/lib/api";
import { generateMarkdown } from "@/src/lib/exportUtils"; // <-- Import the new utility
import { CheckCircle, Download, RefreshCw } from "lucide-react"; // <-- Added Download icon

export default function Home() {
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);

  // The function to trigger the browser download
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

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-8">
      
      {!reviewData ? (
        // ... (Keep your existing InputForm state here exactly as it is) ...
        <>
           {/* Header Section */}
           <div className="text-center max-w-2xl mb-10 mt-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              ARCHON <span className="text-blue-600">The Code Reviewer</span>
            </h1>
            <p className="text-lg text-gray-600">
              Deep context architectural analysis for GitHub and Bitbucket. 
            </p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl">
            <InputForm onSuccess={(data) => setReviewData(data)} />
          </div>
        </>
      ) : (
        /* Results Dashboard */
        <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Dashboard Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <CheckCircle className="w-7 h-7 text-green-500 mr-3" />
                Analysis Complete
              </h2>
              <p className="text-gray-500 mt-1">
                Found <strong className="text-gray-900">{reviewData.issues.length}</strong> architectural improvements.
              </p>
            </div>
            
            {/* The New Action Buttons Group */}
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
              <button 
                onClick={handleDownloadMarkdown}
                className="flex items-center bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded shadow-sm transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report (.md)
              </button>
              
              <button 
                onClick={() => setReviewData(null)}
                className="flex items-center bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Review Another PR
              </button>
            </div>
          </div>
          
          {/* ... (Keep your existing Issue Cards List here exactly as it is) ... */}
          <div className="space-y-6">
            {reviewData.issues.map((issue, index) => (
              <ReviewCard key={index} issue={issue} />
            ))}
          </div>

        </div>
      )}
    </main>
  );
}