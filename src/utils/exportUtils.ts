import { ResearchStep, ResearchStepType, ResearchGraphManager, ExportedResearchData } from '../types';

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export async function exportToMarkdown(
  query: string,
  steps: ResearchStep[],
  metadata?: Record<string, any>
): Promise<string> {
  let markdown = `# Research: ${query}\n\n`;

  if (metadata) {
    markdown += `## Metadata\n\n`;
    markdown += `**Generated:** ${metadata.timestamp}\n`;
    markdown += `**Model:** ${metadata.model}\n`;
    markdown += `**Effort:** ${metadata.effort}\n`;
    if (metadata.duration) {
      markdown += `**Duration:** ${formatDuration(metadata.duration)}\n`;
    }
    markdown += '\n';
  }

  markdown += `---\n\n`;

  for (const step of steps) {
    if (step.type === ResearchStepType.USER_QUERY) {
      continue; // Skip user query since it's already at the top
    }

    markdown += `## ${step.title}\n\n`;
    markdown += `*${step.timestamp || 'No timestamp'}*\n\n`;

    if (typeof step.content === 'string') {
      markdown += `${step.content}\n\n`;
    }

    if (step.sources && step.sources.length > 0) {
      markdown += `### Sources\n\n`;
      step.sources.forEach((source, idx) => {
        markdown += `${idx + 1}. [${source.name}](${source.url || '#'})\n`;
      });
      markdown += '\n';
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportResearch(
  query: string,
  steps: ResearchStep[],
  format: 'markdown' | 'json' = 'markdown',
  metadata?: { model: string; effort: string; duration?: number }
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedQuery = query.slice(0, 50).replace(/[^a-zA-Z0-9]/g, '-');

  if (format === 'markdown') {
    const content = await exportToMarkdown(query, steps, {
      ...metadata,
      model: metadata?.model || 'Unknown',
      effort: metadata?.effort || 'Unknown',
      timestamp: new Date().toLocaleString()
    });
    downloadFile(content, `research-${sanitizedQuery}-${timestamp}.md`, 'text/markdown');
  } else {
    const content = JSON.stringify({
      query,
      steps: steps.map(step => ({
        ...step,
        content: typeof step.content === 'string' ? step.content : '[Complex content]'
      })),
      timestamp: new Date().toISOString(),
      metadata
    }, null, 2);
    downloadFile(content, `research-${sanitizedQuery}-${timestamp}.json`, 'application/json');
  }
}

// Generate a shareable link (placeholder - would need backend implementation)
export function generateShareableLink(sessionId: string): string {
  // This would typically generate a URL to a backend endpoint
  // For now, we'll just copy the session data to clipboard
  return `${window.location.origin}?session=${sessionId}`;
}

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (!successful) {
        console.error('Fallback copy failed');
        return false;
      }

      return true;
    } catch (fallbackErr) {
      console.error('Both clipboard methods failed:', fallbackErr);
      return false;
    }
  }
}


// Calculate reading time estimate
export function estimateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// New export utilities
export function exportResearchAsJSON(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export function exportToJSON(data: ExportedResearchData): string {
  return JSON.stringify(data, null, 2);
}

export function exportToDetailedMarkdown(data: ExportedResearchData): string {
  let md = `# Research Report\n\n`;
  md += `**Query:** ${data.query}\n\n`;
  md += `**Date:** ${new Date(data.exportDate).toLocaleString()}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `- **Total Steps:** ${data.summary.totalSteps}\n`;
  md += `- **Sources Found:** ${data.summary.totalSources}\n`;
  md += `- **Duration:** ${formatDuration(data.summary.totalDuration)}\n`;
  md += `- **Success Rate:** ${(data.summary.successRate * 100).toFixed(1)}%\n`;
  md += `- **Models Used:** ${data.summary.modelsUsed.join(', ')}\n`;

  if (data.metadata.confidenceScore !== undefined) {
    md += `- **Confidence Score:** ${(data.metadata.confidenceScore * 100).toFixed(1)}%\n`;
  }
  if (data.metadata.queryType) {
    md += `- **Query Type:** ${data.metadata.queryType}\n`;
  }
  if (data.metadata.hostParadigm) {
    md += `- **Host Paradigm:** ${data.metadata.hostParadigm}\n`;
  }

  // Research Steps
  md += `\n## Research Steps\n\n`;
  data.steps.forEach((step, index) => {
    md += `### ${index + 1}. ${step.title}\n\n`;
    md += `**Time:** ${step.timestamp}`;
    if (step.duration) {
      md += ` (${formatDuration(step.duration)})`;
    }
    md += `\n\n`;

    md += `${step.content}\n\n`;

    if (step.sources && step.sources.length > 0) {
      md += `**Sources:**\n`;
      step.sources.forEach(source => {
        md += `- [${source.title || source.url}](${source.url})`;
        if (source.authors?.length) {
          md += ` - ${source.authors.join(', ')}`;
        }
        md += `\n`;
      });
      md += `\n`;
    }

    if (step.metadata?.evaluationMetadata) {
      const evaluation = step.metadata.evaluationMetadata;
      md += `**Evaluation:**\n`;
      md += `- Completeness: ${(evaluation.completeness || 0) * 100}%\n`;
      md += `- Accuracy: ${(evaluation.accuracy || 0) * 100}%\n`;
      md += `- Clarity: ${(evaluation.clarity || 0) * 100}%\n`;
      if (evaluation.feedback) {
        md += `- Feedback: ${evaluation.feedback}\n`;
      }
      md += `\n`;
    }
  });

  // All Sources
  md += `\n## All Sources\n\n`;
  data.sources.all.forEach((source, index) => {
    md += `${index + 1}. [${source.title || source.url}](${source.url})`;
    if (source.authors?.length) {
      md += ` - ${source.authors.join(', ')}`;
    }
    if (source.published) {
      md += ` (${new Date(source.published).getFullYear()})`;
    }
    md += `\n`;
  });

  // Function Calls
  if (data.functionCalls && data.functionCalls.length > 0) {
    md += `\n## Function Calls\n\n`;
    data.functionCalls.forEach(fc => {
      md += `### Step: ${fc.step}\n\n`;
      fc.calls.forEach(call => {
        md += `- **${call.name}**\n`;
        md += `  - Args: \`${JSON.stringify(call.arguments)}\`\n`;
        md += `  - Result: \`${JSON.stringify(call.result)}\`\n`;
      });
      md += `\n`;
    });
  }

  return md;
}

export function exportToCSV(data: ExportedResearchData): string {
  const rows: string[][] = [
    ['Step', 'Type', 'Title', 'Content', 'Sources', 'Duration', 'Model', 'Confidence']
  ];

  data.steps.forEach(step => {
    rows.push([
      step.id,
      step.type,
      step.title,
      step.content.substring(0, 100) + '...',
      (step.sources || []).map(s => s.url).join('; '),
      step.duration ? formatDuration(step.duration) : '',
      step.metadata?.model || '',
      step.metadata?.confidenceScore ? `${(step.metadata.confidenceScore * 100).toFixed(1)}%` : ''
    ]);
  });

  return rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}


