// frontend/src/lib/exportUtils.ts
import { ReviewResponse } from './api';

export const generateMarkdown = (data: ReviewResponse): string => {
  let md = `# AI Architecture Review Report\n\n`;
  
  // 1. ADD THE NEW AUDIT TRAIL (Files Scanned)
  if (data.analyzedFiles && data.analyzedFiles.length > 0) {
    md += `## 🗂️ Audit Trail: Files Scanned\n\n`;
    data.analyzedFiles.forEach(file => {
      if (file.issueCount === 0) {
        md += `- ✅ \`${file.filename}\` (No Changes Needed)\n`;
      } else {
        md += `- ⚠️ \`${file.filename}\` (${file.issueCount} ${file.issueCount === 1 ? 'Issue' : 'Issues'})\n`;
      }
    });
    md += `\n---\n\n`;
  }

  // 2. DETAILED ISSUES SECTION
  md += `## 🛠️ Detailed Improvements: ${data.issues.length}\n\n`;

  if (data.issues.length === 0) {
    md += `*🎉 Excellent work! No structural, performance, or security flaws were found in this Pull Request.*\n`;
    return md;
  }

  data.issues.forEach((issue, index) => {
    md += `### ${index + 1}. ${issue.title}\n\n`;
    
    // Metadata block
    md += `- **File:** \`${issue.file_path}\`${issue.line_number ? ` (Line ${issue.line_number})` : ''}\n`;
    md += `- **Severity:** ${issue.severity}\n`;
    md += `- **Category:** ${issue.category}\n`;
    
    // Added newly introduced Impact field
    if (issue.impact) {
      md += `- **Impact:** ${issue.impact}\n`;
    }
    md += `\n`;
    
    // Core content
    md += `#### 🔴 The Problem\n${issue.explanation}\n\n`;
    md += `#### 🟢 Suggested Fix\n${issue.suggested_fix}\n\n`;
    
    // Code diff (formatting safely)
    if (issue.code_diff && issue.code_diff.trim().length > 0) {
      // Clean up existing markdown ticks if the AI included them
      const cleanDiff = issue.code_diff.replace(/^```(diff)?\n/i, '').replace(/\n```$/i, '');
      md += `#### Code Changes\n\`\`\`diff\n${cleanDiff}\n\`\`\`\n\n`;
    }

    // Added newly introduced Complexity Analysis field
    if (issue.complexity_analysis) {
       md += `#### ⚡ Complexity Analysis\n`;
       md += `- **Current:** ${issue.complexity_analysis.current}\n`;
       md += `- **Improved:** ${issue.complexity_analysis.improved}\n`;
       md += `- **Notes:** ${issue.complexity_analysis.notes}\n\n`;
    }
    
    // Trade-offs as a blockquote
    if (issue.trade_offs) {
      md += `> **Trade-offs:** ${issue.trade_offs}\n\n`;
    }

    md += `---\n\n`;
  });

  return md;
};