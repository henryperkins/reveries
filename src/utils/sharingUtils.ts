/**
 * Sharing utilities with accurate size calculation for URLs
 */

export interface ShareableGraphData {
  query: string;
  nodes: number;
  duration: number;
  success: boolean;
  compressedGraph?: string;
}

/**
 * Calculate actual URL size after encoding
 */
function calculateEncodedSize(data: string): number {
  // URL encoding can add up to 3x overhead for special characters
  const urlEncodedSize = encodeURIComponent(btoa(data)).length;
  return urlEncodedSize;
}

/**
 * Compress graph data for sharing with size validation
 */
export function createShareableLink(
  baseUrl: string,
  graphData: ShareableGraphData,
  maxUrlLength = 2000
): { url: string | null; reason?: string; actualSize: number } {
  try {
    // Serialize and compress the data
    const serialized = JSON.stringify(graphData);
    const actualSize = calculateEncodedSize(serialized);

    // Check if it fits within URL limits
    const baseUrlSize = baseUrl.length + '?data='.length;
    if (baseUrlSize + actualSize > maxUrlLength) {
      return {
        url: null,
        reason: `Data too large: ${actualSize} bytes (max: ${maxUrlLength - baseUrlSize})`,
        actualSize
      };
    }

    // Create the URL
    const encodedData = encodeURIComponent(btoa(serialized));
    const shareUrl = `${baseUrl}?data=${encodedData}`;

    return {
      url: shareUrl,
      actualSize: shareUrl.length
    };
  } catch (error) {
    return {
      url: null,
      reason: `Encoding failed: ${error}`,
      actualSize: 0
    };
  }
}

/**
 * Parse shared graph data from URL
 */
export function parseSharedLink(url: string): ShareableGraphData | null {
  try {
    const urlObj = new URL(url);
    const dataParam = urlObj.searchParams.get('data');

    if (!dataParam) return null;

    const decoded = atob(decodeURIComponent(dataParam));
    return JSON.parse(decoded) as ShareableGraphData;
  } catch (error) {
    console.error('Failed to parse shared link:', error);
    return null;
  }
}

/**
 * Create a lightweight summary for sharing when full data is too large
 */
export function createGraphSummary(
  nodes: { id: string; type: string }[],
  stats: { totalDuration: number; errorCount: number },
  query: string
): ShareableGraphData {
  return {
    query: query.substring(0, 200), // Truncate long queries
    nodes: nodes.length,
    duration: stats.totalDuration,
    success: stats.errorCount === 0,
    // Skip compressed graph for summary
  };
}

/**
 * Estimate if graph data will fit in a URL before processing
 */
export function willFitInUrl(
  dataSize: number,
  baseUrlLength = 50,
  maxUrlLength = 2000
): boolean {
  // Rough estimation including encoding overhead
  const estimatedSize = baseUrlLength + Math.ceil(dataSize * 1.5); // 50% overhead estimate
  return estimatedSize <= maxUrlLength;
}
