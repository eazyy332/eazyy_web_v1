import React, { useState } from 'react';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { motion } from 'framer-motion';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: string | number;
  height?: string | number;
  placeholderSrc?: string;
  onClick?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholderSrc,
  onClick
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  // Default placeholder if none provided
  const defaultPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48L3N2Zz4=';

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
  };

  return (
    <motion.div
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
      animate={{ opacity: isLoaded ? 1 : 0.5 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      {isError ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
          Image not available
        </div>
      ) : (
        <LazyLoadImage
          src={src}
          alt={alt}
          effect="blur"
          width={width}
          height={height}
          placeholderSrc={placeholderSrc || defaultPlaceholder}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover ${className}`}
          wrapperClassName="w-full h-full"
        />
      )}
    </motion.div>
  );
};

export default LazyImage;