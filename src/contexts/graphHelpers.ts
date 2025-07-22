export const getNodePosition = (nodeId: string): { x: number; y: number } | null => {
  const element = document.getElementById(nodeId);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top };
};

export const getNodeDimensions = (nodeId: string): { width: number; height: number } | null => {
  const element = document.getElementById(nodeId);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
};

export const isNodeInViewport = (nodeId: string): boolean => {
  const element = document.getElementById(nodeId);
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

export const getViewportBounds = (): { width: number; height: number } => {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight
  };
};
