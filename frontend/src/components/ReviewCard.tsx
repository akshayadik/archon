// frontend/src/components/ReviewCard.tsx
import React from 'react';
import { 
  AlertOctagon, AlertTriangle, Info, CheckCircle2, 
  ShieldAlert, Zap, PaintRoller, Activity, FileCode2 
} from 'lucide-react';
import { ReviewIssue } from '../lib/api';

interface ReviewCardProps {
  issue: ReviewIssue;
}

export default function ReviewCard({ issue }: ReviewCardProps) {
  
  // 1. Dynamic Styling Helpers
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <AlertOctagon className="w-4 h-4 mr-1.5" />;
      case 'High': return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      case 'Medium': return <Info className="w-4 h-4 mr-1.5" />;
      case 'Low': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      default: return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Security': return <ShieldAlert className="w-4 h-4 mr-1.5" />;
      case 'Perf': return <Zap className="w-4 h-4 mr-1.5" />;
      case 'Design': return <PaintRoller className="w-4 h-4 mr-1.5" />;
      case 'Maintainability': return <Activity className="w-4 h-4 mr-1.5" />;
      default: return <FileCode2 className="w-4 h-4 mr-1.5" />;
    }
  };

  // 2. Custom Lightweight Diff Renderer
  const renderDiff = (diffStr: string) => {
    // Strip markdown code block ticks if the AI included them
    const cleanDiff = diffStr.replace(/^```(diff)?\n/i, '').replace(/\n```$/i, '');
    const lines = cleanDiff.split('\n');

    return (
      <div className="mt-4 rounded-md overflow-hidden border border-gray-700 bg-[#1e1e1e] text-sm font-mono text-gray-300">
        <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-700">
          Suggested Code Change
        </div>
        <div className="p-4 overflow-x-auto">
          {lines.map((line, idx) => {
            const isAdded = line.startsWith('+');
            const isRemoved = line.startsWith('-');
            
            let lineClass = "px-2 py-0.5 whitespace-pre ";
            if (isAdded) lineClass += "bg-green-900/30 text-green-400";
            else if (isRemoved) lineClass += "bg-red-900/30 text-red-400";
            
            return (
              <div key={idx} className={lineClass}>
                <span className="opacity-50 select-none mr-4">
                  {isAdded ? '+' : isRemoved ? '-' : ' '}
                </span>
                {line.substring(1)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      
      {/* Header Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center text-sm font-mono text-gray-600 bg-gray-200 px-3 py-1 rounded-md">
          <FileCode2 className="w-4 h-4 mr-2" />
          {issue.file_path} {issue.line_number ? `(Line ${issue.line_number})` : ''}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityStyles(issue.severity)}`}>
            {getSeverityIcon(issue.severity)}
            {issue.severity}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {getCategoryIcon(issue.category)}
            {issue.category}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-6 space-y-5">
        <h3 className="text-xl font-bold text-gray-900">{issue.title}</h3>

        {/* The "Why" */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">The Problem</h4>
          <p className="text-gray-700 leading-relaxed bg-red-50 border-l-4 border-red-400 pl-4 py-2 rounded-r-md">
            {issue.explanation}
          </p>
        </div>

        {/* The "How" */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Suggested Fix</h4>
          <p className="text-gray-800 leading-relaxed bg-green-50 border-l-4 border-green-500 pl-4 py-2 rounded-r-md">
            {issue.suggested_fix}
          </p>
        </div>

        {/* Code Diff (if provided by AI) */}
        {issue.code_diff && issue.code_diff.length > 5 && renderDiff(issue.code_diff)}

        {/* The Trade-offs (Building Trust) */}
        <div className="pt-4 mt-4 border-t border-gray-100 flex items-start">
          <Info className="w-5 h-5 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-gray-600">Architectural Trade-offs</h4>
            <p className="text-sm text-gray-500 italic mt-1">
              {issue.trade_offs}
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
}