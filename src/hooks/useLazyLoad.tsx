import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const useLazyLoad = ({
  threshold = 0.1,
  rootMargin = '100px',
  triggerOnce = true
}: UseLazyLoadOptions = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const cleanupObserver = useCallback(() => {
    if (observerRef.current && element) {
      observerRef.current.unobserve(element);
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, [element]);

  useEffect(() => {
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isElementVisible = entry.isIntersecting;
        setIsVisible(isElementVisible);

        if (isElementVisible && triggerOnce && observerRef.current) {
          cleanupObserver();
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(element);

    return () => {
      cleanupObserver();
    };
  }, [element, threshold, rootMargin, triggerOnce, cleanupObserver]);

  return { isVisible, setElement };
};

export default useLazyLoad;