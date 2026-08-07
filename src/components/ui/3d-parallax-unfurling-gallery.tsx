import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import { AssetImage, LocationBadge } from '../../lib/media-asset';

interface ImageCardProps {
  src: string;
  onLoad?: () => void;
}

function ImageCard({ src, onLoad }: ImageCardProps) {
  return (
    <div className="w-full h-[200px] sm:h-[300px] md:h-[400px] flex-shrink-0 bg-[#111] transition-transform duration-300 hover:scale-[1.02] cursor-pointer relative will-change-transform [backface-visibility:hidden] [transform-style:preserve-3d]">
      <AssetImage
        src={src}
        alt="Inside the chair"
        loading="lazy"
        onLoad={onLoad}
        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-300"
      />
      <LocationBadge path={src} />
    </div>
  );
}

interface ParallaxUnfurlingGalleryProps {
  images: string[];
}

export default function ParallaxUnfurlingGallery({ images }: ParallaxUnfurlingGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const loadedCountRef = useRef(0);

  const handleItemLoad = useCallback(() => {
    loadedCountRef.current += 1;
    if (!isReady && loadedCountRef.current >= 1) setIsReady(true);
  }, [isReady]);

  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const colMedia = useMemo(() => {
    const col1Base = images.filter((_, i) => i % 4 === 0);
    const col2Base = images.filter((_, i) => i % 4 === 1);
    const col3Base = images.filter((_, i) => i % 4 === 2);
    const col4Base = images.filter((_, i) => i % 4 === 3);

    return {
      col1: [...col1Base, ...col1Base],
      col2: [...col2Base, ...col2Base],
      col3: [...col3Base, ...col3Base],
      col4: [...col4Base, ...col4Base],
    };
  }, [images]);

  // Tracks the page's own scroll (this section is embedded in a normal page,
  // not a standalone scroll container), so no `container` option here.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const prefersReducedMotion = useReducedMotion();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
    // Reduced motion: track scroll directly, no spring overshoot/lag.
    ...(prefersReducedMotion ? { stiffness: 1000, damping: 100, mass: 0.1 } : {}),
  });

  // Banner animations
  const bannerWidth = useTransform(smoothProgress, [0, 0.15], ['90vw', '100vw']);
  const bannerHeight = useTransform(smoothProgress, [0, 0.15], ['80vh', '100vh']);
  const bannerRadius = useTransform(smoothProgress, [0, 0.15], ['48px', '0px']);
  const bannerBorderWidth = useTransform(smoothProgress, [0, 0.15], ['4px', '0px']);

  // 3D Matrix animations
  const rotateY = useTransform(smoothProgress, [0.15, 1], [-45, -8]);
  const rotateX = useTransform(smoothProgress, [0.15, 1], [25, 4]);
  const rotateZ = useTransform(smoothProgress, [0.15, 1], [15, 2]);
  const translateZ = useTransform(smoothProgress, [0.15, 1], [-800, 0]);

  // Track columns parallax animations
  const yCol1 = useTransform(smoothProgress, [0.15, 1], ['0%', '-40%']);
  const yCol2 = useTransform(smoothProgress, [0.15, 1], ['-40%', '10%']);
  const yCol3 = useTransform(smoothProgress, [0.15, 1], ['0%', '-40%']);
  const yCol4 = useTransform(smoothProgress, [0.15, 1], ['-30%', '20%']);

  return (
    <section
      ref={containerRef}
      aria-label="A look inside the chair — photo gallery"
      className="relative w-full h-[600vh] bg-[#050505] text-white font-sans selection:bg-white selection:text-black"
    >
      <div className="sticky top-0 h-screen w-full flex justify-center items-center overflow-hidden">
        <motion.div
          style={{
            width: bannerWidth,
            height: bannerHeight,
            borderRadius: bannerRadius,
            borderWidth: bannerBorderWidth,
            borderColor: '#2a2a2a',
          }}
          className="relative bg-black overflow-hidden flex items-center justify-center max-w-[1920px] mx-auto will-change-transform [backface-visibility:hidden] [transform-style:preserve-3d]"
        >
          <div
            className="absolute inset-0 flex justify-center items-center pointer-events-none"
            style={{ perspective: '1000px' }}
          >
            {/* Ambient Shadow Box Masking */}
            <div className="absolute inset-0 z-20 shadow-[inset_0_100px_150px_-50px_rgba(0,0,0,1),inset_0_-100px_150px_-50px_rgba(0,0,0,1)]" />
            <div className="absolute inset-0 z-20 shadow-[inset_150px_0_150px_-50px_rgba(0,0,0,1),inset_-150px_0_150px_-50px_rgba(0,0,0,1)]" />

            {/* Parallax Image Grid Matrix */}
            <motion.div
              style={{
                rotateX,
                rotateY,
                rotateZ,
                z: translateZ,
                transformStyle: 'preserve-3d',
              }}
              className="flex gap-4 md:gap-6 justify-center items-center w-[120vw] h-[150vh] origin-center opacity-100 will-change-transform [backface-visibility:hidden]"
            >
              <motion.div
                style={{ y: yCol1 }}
                className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto"
              >
                {colMedia.col1.map((src, index) => (
                  <ImageCard key={`col1-${index}`} src={src} onLoad={handleItemLoad} />
                ))}
              </motion.div>

              <motion.div
                style={{ y: yCol2 }}
                className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto"
              >
                {colMedia.col2.map((src, index) => (
                  <ImageCard key={`col2-${index}`} src={src} onLoad={handleItemLoad} />
                ))}
              </motion.div>

              <motion.div
                style={{ y: yCol3 }}
                className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto"
              >
                {colMedia.col3.map((src, index) => (
                  <ImageCard key={`col3-${index}`} src={src} onLoad={handleItemLoad} />
                ))}
              </motion.div>

              <motion.div
                style={{ y: yCol4 }}
                className="flex flex-col gap-4 md:gap-6 w-[22vw] min-w-[200px] pointer-events-auto"
              >
                {colMedia.col4.map((src, index) => (
                  <ImageCard key={`col4-${index}`} src={src} onLoad={handleItemLoad} />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
