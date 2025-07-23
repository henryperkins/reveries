import React from 'react';

interface DebugVisibilityProps {
  label: string;
  children: React.ReactNode;
}

export const DebugVisibility: React.FC<DebugVisibilityProps> = ({ label, children }) => {
  return (
    <div className="debug-component border-2 border-dashed border-red-500 p-2 m-2">
      <div className="text-xs text-red-600 mb-1">{label}</div>
      {children}
    </div>
  );
};

// Helper to log component mounting
export const useComponentLogger = (componentName: string) => {
  React.useEffect(() => {
    console.log(`[DEBUG] ${componentName} mounted`);
    return () => console.log(`[DEBUG] ${componentName} unmounted`);
  }, [componentName]);
};
