import React, { Suspense, lazy, ComponentType } from 'react';

interface LazyComponentProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

const LazyComponent: React.FC<LazyComponentProps> = ({ 
  component, 
  fallback = <div className="w-full h-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
  </div>, 
  props = {} 
}) => {
  const LazyLoadedComponent = lazy(component);

  return (
    <Suspense fallback={fallback}>
      <LazyLoadedComponent {...props} />
    </Suspense>
  );
};

export default LazyComponent;