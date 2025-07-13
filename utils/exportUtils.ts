import { ResearchStep, ResearchStepType } from '../types';

export async function exportToMarkdown(
  query: string,
  steps: ResearchStep[],
  metadata?: { model: string; effort: string; timestamp: string; duration?: number }
): Promise<string> {
  let markdown = `# Research Report\n\n`;
  markdown += `**Query:** ${query}\n\n`;

  if (metadata) {
    markdown += `**Date:** ${metadata.timestamp}\n`;
    markdown += `**Model:** ${metadata.model}\n`;
    markdown += `**Effort:** ${metadata.effort}\n`;
    if (metadata.duration) {
      markdown += `**Duration:** ${(metadata.duration / 1000).toFixed(1)}s\n`;
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
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error('Failed to copy to clipboard:', fallbackErr);
      return false;
    }
  }
}

// Format duration in a human-readable way
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Calculate reading time estimate
export function estimateReadingTime(text: string): string {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}
