// src/components/ui/spinner.tsx
export const Spinner = ({ className = '' }) => (
    <div
      className={`animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full ${className}`}
    />
  );