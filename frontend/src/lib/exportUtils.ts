// frontend/src/lib/exportUtils.ts
import { ReviewResponse } from './api';

export const generateMarkdown = (data: ReviewResponse): string => {
  let md = `# AI Architecture Review Report\n\n`;
  md += `**Total Improvements Found:** ${data.issues.length}\n\n---\n\n`;

  data.issues.forEach((issue, index) => {
    md += `## ${index + 1}. ${issue.title}\n\n`;
    
    // Metadata block
    md += `- **File:** \`${issue.file_path}\`${issue.line_number ? ` (Line ${issue.line_number})` : ''}\n`;
    md += `- **Severity:** ${issue.severity}\n`;
    md += `- **Category:** ${issue.category}\n\n`;
    
    // Core content
    md += `### 🔴 The Problem\n${issue.explanation}\n\n`;
    md += `### 🟢 Suggested Fix\n${issue.suggested_fix}\n\n`;
    
    // Code diff (formatting safely)
    if (issue.code_diff && issue.code_diff.trim().length > 0) {
      // Clean up existing markdown ticks if the AI included them
      const cleanDiff = issue.code_diff.replace(/^```(diff)?\n/i, '').replace(/\n```$/i, '');
      md += `### Code Changes\n\`\`\`diff\n${cleanDiff}\n\`\`\`\n\n`;
    }
    
    // Trade-offs as a blockquote
    if (issue.trade_offs) {
      md += `### ⚖️ Architectural Trade-offs\n> ${issue.trade_offs}\n\n`;
    }
    
    md += `---\n\n`;
  });

  return md;
};