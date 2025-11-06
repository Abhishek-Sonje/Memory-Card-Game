import { useEffect, useState } from "react";

const CARD_IMAGES = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Kai",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Sakura",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Haruto",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Yuki",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Ren",
];

/**
 * Simple image preloader using browser's native cache
 * Best for SVGs and small images
 */
export const useImagePreloader = (enabled: boolean = true) => {
  const [loading, setLoading] = useState(enabled);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const totalImages = CARD_IMAGES.length;
    let count = 0;

    // Preload images into browser cache
    const preloadPromises = CARD_IMAGES.map((url) => {
      return new Promise<void>((resolve) => {
        const img = new Image();

        img.onload = () => {
          if (mounted) {
            count++;
            setLoadedCount(count);
          }
          resolve();
        };

        img.onerror = () => {
          console.warn(`Failed to preload: ${url}`);
          if (mounted) {
            count++;
            setLoadedCount(count);
          }
          resolve(); // Don't fail, just continue
        };

        img.src = url;
      });
    });

    Promise.all(preloadPromises).then(() => {
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [enabled]);

  const progress = loading ? (loadedCount / CARD_IMAGES.length) * 100 : 100;

  return {
    loading,
    progress: Math.round(progress),
    loadedCount,
    totalImages: CARD_IMAGES.length,
  };
};

export { CARD_IMAGES };
