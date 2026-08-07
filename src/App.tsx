import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AssetImage, LocationBadge, handleImgError } from './lib/media-asset';
import ParallaxUnfurlingGallery from './components/ui/3d-parallax-unfurling-gallery';

gsap.registerPlugin(ScrollTrigger);
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react';

const LOGO = '/media/photos/logo.jpg'; // Eon Salon brand mark, used in the navbar

// ACT I cinematic layers — transparent-edge PNGs, back to front
const HERO_IMG = '/media/photos/hero.png'; // full-bleed stage backdrop
const L_GLOW = ''; // mirror-bulb glow, screen blend
const L_MIRRORS = ''; // row of station mirrors, mid-back
const L_PORTRAIT_L = ''; // model portrait, left half of the split
const L_PORTRAIT_R = ''; // model portrait, right half of the split
const L_CHAIR = ''; // styling chair, foreground hero object
const L_STRANDS = ''; // hair strands macro, revealed behind the split
// ACT IV plain images
const STUDIO_IMG_1 = '/media/photos/studio-1.jpg';
const STUDIO_IMG_2 = '/media/photos/studio-2.jpg';
const STUDIO_TALL = '/media/photos/studio-tall.jpg';
// Salon best things photo
const BEST_THINGS_IMG = '/media/photos/best-things.jpg';

// Section theme videos
const LOOKBOOK_VIDEO = '/media/videos/lookbook-theme.mp4';
const LEADING_VIDEO = '/media/videos/leading-theme.mp4';
const STUDIO_VIDEO = '/media/videos/studio-theme.mp4';

// Below-the-hero homepage sections
const ABOUT_VIDEO = '/media/videos/salon-tour.mp4';
const MAP_EMBED_SRC =
  'https://www.google.com/maps?q=Eon+Salon,+Shani+Mandir+Rd,+Tathawade,+Pimpri-Chinchwad,+Maharashtra+411033&output=embed';

/* ============================================================ */
/* Math helpers                                                  */
/* ============================================================ */

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

const smoothstep = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const segmentInOut = (s: number, a: number, b: number, c: number, d: number) => {
  const enter = smoothstep(a, b, s);
  const exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};

/* ============================================================ */
/* Shared hooks                                                  */
/* ============================================================ */

interface StaggeredReveal<T extends HTMLElement = HTMLElement> {
  containerRef: RefObject<T | null>;
  getAnimStyle: (i: number) => CSSProperties;
  getImageAnimStyle: (i: number) => CSSProperties;
}

function useStaggeredReveal<T extends HTMLElement = HTMLElement>(
  _count: number,
  threshold = 0.15,
): StaggeredReveal<T> {
  const containerRef = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotionRef.current) {
      setVisible(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const getAnimStyle = useCallback(
    (i: number): CSSProperties => {
      if (reduceMotionRef.current) return { opacity: 1 };
      return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
      };
    },
    [visible],
  );

  const getImageAnimStyle = useCallback(
    (i: number): CSSProperties => {
      if (reduceMotionRef.current) return { opacity: 1 };
      return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(1.08)',
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms`,
      };
    },
    [visible],
  );

  return { containerRef, getAnimStyle, getImageAnimStyle };
}

function useAutoplayInView(ref: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) el.play().catch(() => {});
          else el.pause();
        });
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}

interface SectionVideoBackgroundProps {
  src: string;
  overlay?: boolean;
}

function SectionVideoBackground({ src, overlay = true }: SectionVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  useAutoplayInView(videoRef);

  if (!src) return null;
  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      {overlay && <div className="absolute inset-0 bg-black/55" aria-hidden="true" />}
    </>
  );
}

/* ============================================================ */
/* Splash screen                                                  */
/* ============================================================ */

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let exitTimeout: ReturnType<typeof setTimeout> | undefined;
    let completeTimeout: ReturnType<typeof setTimeout> | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;

    if (reduceMotion) {
      setCount(100);
      exitTimeout = setTimeout(() => {
        setExiting(true);
        onComplete();
      }, 400);
    } else {
      let step = 0;
      interval = setInterval(() => {
        step += 1;
        setCount(step);
        if (step >= 100) {
          if (interval) clearInterval(interval);
          exitTimeout = setTimeout(() => {
            setExiting(true);
            completeTimeout = setTimeout(onComplete, 900);
          }, 200);
        }
      }, 20);
    }

    return () => {
      document.body.style.overflow = '';
      if (interval) clearInterval(interval);
      if (exitTimeout) clearTimeout(exitTimeout);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#000000] flex items-end justify-start transition-opacity duration-700 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="p-6 md:p-10 leading-none">
        <p className="font-[Bodoni_Moda] text-2xl md:text-4xl tracking-[0.3em] text-[#DDE3E2]">
          EON
        </p>
        <p className="font-[Space_Mono] text-7xl md:text-9xl font-bold tabular-nums leading-none text-[#DDE3E2]">
          {count}
        </p>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Navbar                                                         */
/* ============================================================ */

const NAV_LINKS = ['About', 'Values', 'Works', 'Reels', 'Reviews', 'Location', 'Contact'];

const ABOUT_SCROLL_Y = 2300;

function scrollToAbout(e: ReactMouseEvent) {
  e.preventDefault();
  window.scrollTo({ top: ABOUT_SCROLL_Y, behavior: 'smooth' });
}

function navHref(label: string): string {
  switch (label) {
    case 'About':
      return '#about';
    case 'Values':
      return '#values';
    case 'Works':
      return '#works';
    case 'Reels':
      return '#reels';
    case 'Reviews':
      return '#reviews';
    case 'Location':
      return '#location';
    case 'Contact':
      return '#contact';
    default:
      return '#top';
  }
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-transparent">
        <a href="#top" aria-label="Eon Salon home">
          <img
            src={LOGO}
            alt="Eon Salon"
            className="h-14 w-14 md:h-20 md:w-20 rounded-full object-cover shrink-0"
          />
        </a>

        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center relative"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span
            className={`absolute h-0.5 w-6 bg-[#DDE3E2] rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-[#DDE3E2] rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-[#DDE3E2] rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'
            }`}
          />
        </button>
      </header>

      <div className={`fixed inset-0 z-40 ${menuOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-[#000000] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-8 gap-1">
            {NAV_LINKS.map((label, i) => (
              <a
                key={label}
                href={navHref(label)}
                onClick={(e) => {
                  if (label === 'About') scrollToAbout(e);
                  setMenuOpen(false);
                }}
                className="text-4xl font-[Bodoni_Moda] text-[#DDE3E2] hover:text-[#C9C9C9] transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateX(0)' : 'translateX(2rem)',
                  transitionDelay: `${100 + i * 60}ms`,
                }}
              >
                {label}
              </a>
            ))}
            <div
              className="mt-8 pt-8 border-t border-white/10 transition-opacity duration-500"
              style={{ opacity: menuOpen ? 1 : 0, transitionDelay: '450ms' }}
            >
              <p className="text-sm font-semibold text-[#6E7574] mb-4">Walk-ins till 9pm</p>
              <button
                type="button"
                className="w-full px-6 py-4 bg-[#DDE3E2] rounded-full text-[#000000] text-sm font-semibold hover:bg-[#C9C9C9] transition-colors duration-200"
              >
                Book a chair
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================ */
/* ACT I — cinematic sticky stage                                 */
/* ============================================================ */

function useCinemaScroll(sectionRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const state = {
      targetMouseX: 0,
      targetMouseY: 0,
      mouseX: 0,
      mouseY: 0,
      targetScroll: 0,
      smoothScroll: 0,
      initialized: false,
      rafPending: false,
    };

    let rafId = 0;

    const getScrollDistance = () =>
      clamp(-section.getBoundingClientRect().top, 0, section.offsetHeight - window.innerHeight);

    const requestTick = () => {
      if (state.rafPending) return;
      state.rafPending = true;
      rafId = requestAnimationFrame(update);
    };

    function update() {
      state.rafPending = false;
      state.targetScroll = getScrollDistance();
      if (!state.initialized || reduceMotion.matches) {
        state.smoothScroll = state.targetScroll;
        state.initialized = true;
      } else {
        state.smoothScroll = lerp(state.smoothScroll, state.targetScroll, 0.14);
      }
      if (Math.abs(state.smoothScroll - state.targetScroll) < 0.08) {
        state.smoothScroll = state.targetScroll;
      }

      state.mouseX = lerp(state.mouseX, state.targetMouseX, 0.12);
      state.mouseY = lerp(state.mouseY, state.targetMouseY, 0.12);

      const frame2 = segmentInOut(state.smoothScroll, 560, 900, 1300, 1620);
      const frame3 = segmentInOut(state.smoothScroll, 1760, 2140, 2540, 2700);
      const progress = clamp(state.smoothScroll / 2700);
      const introExit = smoothstep(90, 650, state.smoothScroll);
      const blurActive = clamp(frame2.active + frame3.active);
      const strandsOpacity = frame2.active * (1 - frame3.enter);
      const splitDrift = Math.pow(frame2.enter, 1.5);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3.active * (1 - frame3.exit);
      const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3.enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;

      const mx = reduceMotion.matches ? 0 : state.mouseX;
      const my = reduceMotion.matches ? 0 : state.mouseY;

      root.style.setProperty('--mx', mx.toFixed(4));
      root.style.setProperty('--my', my.toFixed(4));
      root.style.setProperty('--back-opacity', String(1 - frame2.active * 0.06));
      root.style.setProperty('--back-x', `${mx * -12}px`);
      root.style.setProperty('--back-y', `${my * -4}px`);
      root.style.setProperty('--back-scale', String(backScale));
      root.style.setProperty('--glow-y', `${10 + progress * 10}vh`);
      root.style.setProperty('--glow-scale', String(0.78 + progress * 0.16));
      root.style.setProperty('--mirrors-y', `${20 - progress * 8}vh`);
      root.style.setProperty('--blur-px', `${blurActive * 14}px`);
      root.style.setProperty('--back-brightness', String(1 - blurActive * 0.255));
      root.style.setProperty('--mirrors-blur-px', `${frame2.active * 14}px`);
      root.style.setProperty(
        '--mirrors-brightness',
        String(1 - frame2.active * 0.255 - frame3.active * 0.06),
      );
      root.style.setProperty('--mirrors-saturation', String(1 + frame3.active * 0.18));
      root.style.setProperty('--shade-opacity', '1');
      root.style.setProperty('--shade-z', blurActive > 0.02 ? '2' : '0');
      root.style.setProperty('--shade-top-alpha', String(blurActive * 0.465));
      root.style.setProperty('--shade-mid-alpha', String(blurActive * 0.42));
      root.style.setProperty('--shade-bottom-alpha', String(blurActive * 0.51));

      root.style.setProperty('--title-y', `${introExit * -210}px`);
      root.style.setProperty('--title-scale', String(1 - introExit * 0.08));
      root.style.setProperty('--title-opacity', String(1 - introExit));

      root.style.setProperty('--chair-x', `calc(-50% + ${mx * 18}px)`);
      root.style.setProperty('--chair-y', `${my * 8 + sharedHeroY - frame2.exit * 760}px`);
      root.style.setProperty('--chair-bottom', `${5 - frame2.enter * 13}vh`);
      root.style.setProperty('--chair-width', `${67.2 + frame2.enter * 37.8}vw`);
      root.style.setProperty(
        '--chair-scale',
        String(1.02 + sharedHeroScale + frame2.exit * 0.46),
      );

      root.style.setProperty(
        '--split-left-x',
        `calc(-50% + ${-splitDrift * 46}vw + ${mx * 22}px)`,
      );
      root.style.setProperty('--split-left-y', `${my * 10 + sharedHeroY - splitDrift * 180}px`);
      root.style.setProperty(
        '--split-left-scale',
        String(1 + sharedHeroScale + frame2.enter * 0.74),
      );
      root.style.setProperty(
        '--split-right-x',
        `calc(-50% + ${splitDrift * 46}vw + ${mx * 22}px)`,
      );
      root.style.setProperty('--split-right-y', `${my * 10 + sharedHeroY - splitDrift * 180}px`);
      root.style.setProperty(
        '--split-right-scale',
        String(1 + sharedHeroScale + frame2.enter * 0.74),
      );

      root.style.setProperty('--strands-opacity', String(strandsOpacity));
      root.style.setProperty('--strands-x', `calc(-50% + ${mx * 10}px)`);
      root.style.setProperty(
        '--strands-y',
        `calc(-50% + ${my * 8 - frame2.exit * 150}px)`,
      );
      root.style.setProperty(
        '--strands-scale',
        String(1.06 + frame2.enter * 0.08 + frame2.exit * 0.08),
      );

      root.style.setProperty('--intro-copy-y', `${introExit * 90}px`);
      root.style.setProperty('--intro-copy-opacity', String(1 - introExit));

      root.style.setProperty('--panel2-opacity', String(panel2Opacity));
      root.style.setProperty(
        '--panel2-y',
        `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`,
      );
      root.style.setProperty('--panel3-opacity', String(panel3Opacity));
      root.style.setProperty(
        '--panel3-y',
        `calc(-50% + ${-frame3.exit * 86 + (1 - frame3.enter) * 58}px)`,
      );

      const scrollDiff = Math.abs(state.smoothScroll - state.targetScroll) > 0.08;
      const mouseDiff =
        Math.abs(state.mouseX - state.targetMouseX) > 0.001 ||
        Math.abs(state.mouseY - state.targetMouseY) > 0.001;
      if (scrollDiff || mouseDiff) requestTick();
    }

    const onScroll = () => requestTick();
    const onResize = () => requestTick();
    const onPointerMove = (e: PointerEvent) => {
      state.targetMouseX = e.clientX / window.innerWidth - 0.5;
      state.targetMouseY = e.clientY / window.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    requestTick();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [sectionRef]);
}

/* ============================================================ */
/* GSAP hair salon elements                                       */
/* ============================================================ */

function ScissorsGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8.2 8 20 20M20 4 8.2 16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CombGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5h16v3H4V5Zm1 3v11m3-11v11m3-11v11m3-11v11m3-11v11"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DryerGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6h7a5 5 0 0 1 0 10h-1.2L20 20"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 6c-3.5 0-5 1.8-5 5s1.5 5 5 5V6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="13.5" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}

function SprayGlyph() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 9h4v11a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M11 9V6h2v3M9 6h6M13 4l3-1M13 6.5l3.5.5M13 4.5 15 3"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SALON_ELEMENTS = [
  { Glyph: ScissorsGlyph, className: 'top-[14%] left-[7%] w-10 h-10 md:w-14 md:h-14' },
  { Glyph: CombGlyph, className: 'top-[22%] right-[9%] w-9 h-9 md:w-12 md:h-12' },
  { Glyph: DryerGlyph, className: 'bottom-[20%] left-[10%] w-11 h-11 md:w-16 md:h-16' },
  { Glyph: SprayGlyph, className: 'bottom-[16%] right-[7%] w-9 h-9 md:w-12 md:h-12' },
  { Glyph: ScissorsGlyph, className: 'top-[46%] right-[3%] w-8 h-8 md:w-10 md:h-10' },
];

function HairSalonElements() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const icons = gsap.utils.toArray<HTMLElement>('.salon-icon', container);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(icons, { opacity: 0.55 });
        return;
      }

      gsap.fromTo(
        icons,
        { opacity: 0, scale: 0.4, rotate: () => gsap.utils.random(-40, 40) },
        {
          opacity: 0.55,
          scale: 1,
          rotate: 0,
          duration: 1.1,
          stagger: 0.18,
          ease: 'back.out(1.7)',
          delay: 0.3,
        },
      );

      icons.forEach((icon, i) => {
        gsap.to(icon, {
          y: gsap.utils.random(-16, -10),
          rotation: gsap.utils.random(-8, 8),
          duration: gsap.utils.random(2.6, 3.6),
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: 0.3 + i * 0.18,
        });
      });
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-[2] pointer-events-none" aria-hidden="true">
      {SALON_ELEMENTS.map(({ Glyph, className }, i) => (
        <div
          key={i}
          className={`salon-icon absolute text-[#DDE3E2] opacity-0 ${className}`}
        >
          <Glyph />
        </div>
      ))}
    </div>
  );
}

function useHeroParallax(
  sectionRef: RefObject<HTMLElement | null>,
  backdropRef: RefObject<HTMLImageElement | null>,
) {
  useEffect(() => {
    const section = sectionRef.current;
    const backdrop = backdropRef.current;
    if (!section || !backdrop) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.to(backdrop, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=1400',
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, [sectionRef, backdropRef]);
}

function CinemaAct() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const backdropRef = useRef<HTMLImageElement | null>(null);

  useCinemaScroll(sectionRef);
  useHeroParallax(sectionRef, backdropRef);

  return (
    <section
      className="cinema"
      id="stage-act1"
      aria-label="Eon Salon opening sequence"
      ref={sectionRef}
    >
      <div className="stage">
        <div className="world">
          <img
            ref={backdropRef}
            className="layer backdrop"
            src={HERO_IMG}
            alt=""
            loading="eager"
            decoding="async"
            onError={handleImgError}
          />
          <div className="back-stack">
            <AssetImage className="layer back-img glow" src={L_GLOW} alt="" loading="eager" />
            <HairSalonElements />
            <AssetImage
              className="layer back-img mirrors"
              src={L_MIRRORS}
              alt=""
              loading="eager"
            />
          </div>
          <AssetImage className="layer split split-left" src={L_PORTRAIT_L} alt="" loading="eager" />
          <AssetImage
            className="layer split split-right"
            src={L_PORTRAIT_R}
            alt=""
            loading="eager"
          />
          <AssetImage className="layer chair-img" src={L_CHAIR} alt="" loading="eager" />
          <AssetImage className="layer strands-img" src={L_STRANDS} alt="" loading="eager" />
          <div className="shade" />
        </div>
        <div className="hero-copy">
          <div className="hero-mark">
            <h1 className="hero-title">EON</h1>
            <div className="hero-subtitle">
              <span className="hs-salon">Unisex Salon</span>
              <span className="hs-tag">Hair &amp; Beauty</span>
              <span className="hs-credit">Irfan Sheikh</span>
            </div>
          </div>
          <section className="intro-copy" aria-label="Studio overview">
            <div className="hero-tags">
              <span>Unisex</span>
              <span>Cut · Colour · Texture</span>
              <span>Open till 9</span>
            </div>
          </section>
        </div>
        <section className="story-panel panel-cut" aria-label="Cutting">
          <h2>The chair is the whole story.</h2>
          <p>
            Pune's most trusted unisex hair and beauty studio — the
place people recommend without a second thought, because every chair gets the same
care and the same standard, every time.
          </p>
          <dl className="facts">
            <div>
              <dt>2011</dt>
              <dd>First Eon chair, one room, two mirrors</dd>
            </div>
            <div>
              <dt>12</dt>
              <dd>Stylists trained in the Eon cutting method</dd>
            </div>
          </dl>
        </section>
        <section id="about" className="story-panel panel-colour" aria-label="About the salon">
          <h2>Complete grooming combos at just ₹499 </h2>
          <p>
            Haircut • Wash • Beard • D-Tan / Color / Spa
            <br />
            Dryness, frizz, dull skin — don’t wait till the damage shows. Fix it before it starts.
            Glow all season.
            <br />
            <br />
             Deliver expert cuts, colour, and grooming through premium
products and honest pricing, with a team trained to listen before they touch your
hair — no upsell, no script, no rush.
          </p>
          <button type="button" className="note-button">
            <span aria-hidden="true">↗</span>
            <span>More about Eon</span>
          </button>
        </section>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Book Now — floating CTA                                        */
/* ============================================================ */

const PHONE_NUMBER = '+912000000000';
const WHATSAPP_NUMBER = '912000000000';
const EMAIL_ADDRESS = 'hello@eonsalon.in';
const STORE_HOURS = 'Mon – Sun, 10:00 AM – 9:00 PM';

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5c-4.7 0-8.5 3.8-8.5 8.5 0 1.5.4 2.9 1.1 4.2L3.5 20.5l4.5-1.1c1.2.6 2.6 1 4 1 4.7 0 8.5-3.8 8.5-8.5S16.7 3.5 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.8 8.4c.2-.4.4-.5.7-.5h.5c.2 0 .4 0 .5.4.2.5.6 1.5.6 1.6.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.1.1-.3.3-.4.4-.1.1-.3.3-.1.6.2.3.8 1.2 1.6 1.9.9.8 1.7 1.1 2 1.2.3.1.4.1.6-.1.2-.2.7-.8.9-1 .2-.2.4-.2.6-.1.2.1 1.5.7 1.8.8.3.1.5.2.5.3.1.2.1.9-.2 1.4-.3.6-1.4 1.1-2 1.1-.5 0-1.1 0-3.5-1.4-2.9-1.7-4.6-4.7-4.8-4.9-.1-.2-1-1.3-1-2.5 0-1.2.6-1.8.9-2.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1.1.5 1.1 1.1V20c0 .6-.5 1.1-1.1 1.1C10.9 21.1 2.9 13.1 2.9 3.1 2.9 2.5 3.4 2 4 2h3.3c.6 0 1.1.5 1.1 1.1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1L6.6 10.8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m3.5 6 8.5 6.5L20.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 6.5V12l4 2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookNowButton() {
  return (
    <div className="fixed bottom-5 right-5 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-2.5">
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi Eon Salon, I’d like to book an appointment.')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Eon Salon on WhatsApp"
        className="flex items-center justify-center h-11 w-11 md:h-12 md:w-12 rounded-full bg-[#DDE3E2] text-[#121014] shadow-[0_12px_30px_rgba(0,0,0,0.5)] hover:bg-white transition-colors duration-200"
      >
        <WhatsAppIcon />
      </a>
      <a
        href={`tel:${PHONE_NUMBER}`}
        aria-label="Call Eon Salon"
        className="flex items-center justify-center h-11 w-11 md:h-12 md:w-12 rounded-full bg-[#DDE3E2] text-[#121014] shadow-[0_12px_30px_rgba(0,0,0,0.5)] hover:bg-white transition-colors duration-200"
      >
        <PhoneIcon />
      </a>
      <a
        href="#location"
        className="inline-flex items-center gap-2 px-5 py-3.5 md:px-7 md:py-4 rounded-full bg-[#DDE3E2] text-[#121014] font-[Space_Mono] text-xs md:text-sm uppercase tracking-[0.12em] font-bold shadow-[0_18px_40px_rgba(0,0,0,0.55)] hover:bg-white transition-colors duration-200"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#000000]" aria-hidden="true" />
        Book now
      </a>
    </div>
  );
}

/* ============================================================ */
/* Our values                                                     */
/* ============================================================ */

const OUR_VALUES = [
  'Customer satisfaction',
  'Hygiene and cleanliness',
  'Quality products',
  'Innovation in every idea',
  'Transparent pricing',
  'Relaxing atmosphere',
];

function CheckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 mt-1 text-[#DDE3E2]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.5 12.5 10.3 15.3 16.5 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OurValuesSection() {
  const reveal = useStaggeredReveal(6, 0.15);
  return (
    <section
      id="values"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[1] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-[#000000]"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
        <div>
          <div style={reveal.getAnimStyle(0)}>
            <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#C9C9C9]">
              Our values
            </span>
            <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#DDE3E2]">
              What we stand for.
            </h2>
          </div>
          <ul className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 md:gap-y-8 max-w-4xl">
            {OUR_VALUES.map((value, i) => (
              <li key={value} style={reveal.getAnimStyle(i)} className="flex items-start gap-4">
                <CheckIcon />
                <span className="font-[Bodoni_Moda] text-xl md:text-2xl text-[#DDE3E2]">
                  {value}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div
          style={reveal.getImageAnimStyle(5)}
          className="flex justify-center lg:justify-end shrink-0"
        >
          <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border border-white/15 bg-[#0a0a0a]">
            <AssetImage src={LOGO} alt="Eon Salon" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* ACT II — Lookbook mosaic                                       */
/* ============================================================ */

function LookbookSection() {
  const reveal = useStaggeredReveal(1, 0.15);

  return (
    <section
      id="lookbook"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[2] min-h-screen md:h-screen w-full overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 bg-[#000000]"
    >
      <div
        style={reveal.getImageAnimStyle(0)}
        className="relative w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden"
      >
        <SectionVideoBackground src={LOOKBOOK_VIDEO} />
        <p className="absolute top-4 left-4 md:top-7 md:left-7 text-[#DDE3E2] text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] z-10 drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
          Ten chairs, one standard.
          <br />
          Book the stylist, not the gender.
        </p>
        <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10">
          <span className="block text-[#C9C9C9] font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] mb-1 md:mb-2">
            Unisex hair studio · Pune
          </span>
          <h2 className="text-[#DDE3E2] text-[clamp(3rem,11vw,11rem)] font-[Bodoni_Moda] leading-[0.79] tracking-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
            EON
            <br />
            SALON
          </h2>
        </div>
        <p className="absolute bottom-6 right-4 md:bottom-10 md:right-8 text-[#DDE3E2] text-xs md:text-sm font-semibold z-10 drop-shadow-[0_2px_18px_rgba(0,0,0,0.6)]">
          Walk-ins till 9pm
        </p>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Our works                                                      */
/* ============================================================ */

const WORK_CATEGORIES = ['Works', 'BTS', 'Ambiance'] as const;
type WorkCategory = (typeof WORK_CATEGORIES)[number];

const WORK_IMAGES: Record<WorkCategory, string[]> = {
  Works: [
    '/media/photos/works-1.jpg',
    '/media/photos/works-2.jpg',
    '/media/photos/works-3.jpg',
    '/media/photos/works-4.jpg',
    '/media/photos/works-5.jpg',
    '/media/photos/works-6.jpg',
  ],
  BTS: [
    '/media/photos/bts-1.jpg',
    '/media/photos/bts-2.jpg',
    '/media/photos/bts-3.jpg',
    '/media/photos/bts-4.jpg',
    '/media/photos/bts-5.jpg',
    '/media/photos/bts-6.jpg',
  ],
  Ambiance: [
    '/media/photos/ambiance-1.jpg',
    '/media/photos/ambiance-2.jpg',
    '/media/photos/ambiance-3.jpg',
    '/media/photos/ambiance-4.jpg',
    '/media/photos/ambiance-5.jpg',
    '/media/photos/ambiance-6.jpg',
  ],
};

function OurWorksSection() {
  const reveal = useStaggeredReveal<HTMLDivElement>(1, 0.15);
  const galleryImages = useMemo(
    () => [...WORK_IMAGES.Works, ...WORK_IMAGES.BTS, ...WORK_IMAGES.Ambiance],
    [],
  );

  return (
    <section id="works" className="scroll-mt-20 relative z-[3] rounded-t-[2rem] md:rounded-t-[3rem] overflow-hidden bg-white">
      <div
        ref={reveal.containerRef}
        style={reveal.getAnimStyle(0)}
        className="max-w-6xl mx-auto px-4 md:px-10 pt-20 md:pt-28 pb-10 md:pb-14"
      >
        <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#000000]/60">
          Our works
        </span>
        <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#000000]">
          A look inside the chair.
        </h2>
      </div>
      <ParallaxUnfurlingGallery images={galleryImages} />
    </section>
  );
}

/* ============================================================ */
/* Instagram reels                                                */
/* ============================================================ */

interface ReelItem {
  src: string;
  poster: string;
}

const REELS: ReelItem[] = [
  { src: ABOUT_VIDEO, poster: '' },
  { src: '/media/videos/reel-2.mp4', poster: '' },
  { src: '/media/videos/reel-3.mp4', poster: '' },
  { src: '/media/videos/reel-4.mp4', poster: '' },
];

function ReelVideo({ src, poster }: { src: string; poster: string }) {
  if (!src) return null;
  return (
    <video
      className="w-full h-full object-cover"
      src={src}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}

function InstagramReelSection() {
  const reveal = useStaggeredReveal(4, 0.1);
  return (
    <section
      id="reels"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[4] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-[#000000]"
    >
      <div className="max-w-6xl mx-auto">
        <div style={reveal.getAnimStyle(0)}>
          <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#C9C9C9]">
            From Instagram
          </span>
          <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#DDE3E2]">
            Reels from the chair.
          </h2>
        </div>
        <div className="mt-10 md:mt-14 flex md:grid md:grid-cols-4 gap-3 md:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2">
          {REELS.map((reel, i) => (
            <div
              key={i}
              style={reveal.getImageAnimStyle(i)}
              className="relative shrink-0 w-[62vw] md:w-auto snap-start rounded-xl md:rounded-2xl overflow-hidden bg-[#000000] aspect-[9/16]"
            >
              <ReelVideo src={reel.src} poster={reel.poster} />
              <LocationBadge path={reel.src} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* ACT III — Price mosaic                                         */
/* ============================================================ */

interface OfferItem {
  name: string;
  price: number;
}

const MEN_OFFERS: OfferItem[] = [
  { name: 'Hair cut', price: 99 },
  { name: 'Beard', price: 80 },
  { name: 'Global Hair colour', price: 249 },
  { name: 'Hair spa', price: 299 },
  { name: 'D-tan', price: 199 },
  { name: 'Facial', price: 599 },
  { name: 'Hydra Facial', price: 799 },
];

const WOMEN_OFFERS: OfferItem[] = [
  { name: 'Hair Cut', price: 249 },
  { name: 'Hair wash & Blow dry', price: 199 },
  { name: 'Global Hair Color', price: 1499 },
  { name: 'Root Touchup', price: 599 },
  { name: 'Hair Spa', price: 799 },
  { name: 'Bleach', price: 299 },
  { name: 'D-Tan', price: 399 },
  { name: 'Facial', price: 599 },
  { name: 'Manicure/Pedicure', price: 799 },
];

function OfferList({ items }: { items: OfferItem[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.name}
          className="flex items-baseline justify-between gap-4 py-3 md:py-3.5 border-b border-white/15"
        >
          <span className="text-sm md:text-base text-[#DDE3E2]">{item.name}</span>
          <span className="font-[Space_Mono] text-sm md:text-base font-bold text-[#DDE3E2] shrink-0">
            ₹{item.price}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PriceSection() {
  const reveal = useStaggeredReveal(3, 0.1);

  return (
    <section
      id="prices"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[5] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-[#000000]"
    >
      <SectionVideoBackground src={LEADING_VIDEO} />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div style={reveal.getAnimStyle(0)}>
          <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#C9C9C9]">
            Price list
          </span>
          <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#DDE3E2]">
            Offers for everyone.
          </h2>
        </div>
        <div className="mt-10 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <div style={reveal.getAnimStyle(0)}>
            <h3 className="font-[Bodoni_Moda] text-5xl md:text-7xl leading-none text-[#DDE3E2] mb-6 md:mb-8">
              Men
            </h3>
            <OfferList items={MEN_OFFERS} />
          </div>
          <div style={reveal.getAnimStyle(1)}>
            <h3 className="font-[Bodoni_Moda] text-5xl md:text-7xl leading-none text-[#DDE3E2] mb-6 md:mb-8">
              Women
            </h3>
            <OfferList items={WOMEN_OFFERS} />
          </div>
        </div>
        <div style={reveal.getAnimStyle(2)} className="mt-12 md:mt-16 flex justify-center">
          <a
            href="#location"
            className="px-10 py-4 md:px-14 md:py-5 bg-[#DDE3E2] text-[#121014] rounded-full text-base md:text-lg font-[Space_Mono] uppercase tracking-[0.1em] font-bold hover:bg-white transition-colors"
          >
            Book Now
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Leading the way — stats                                        */
/* ============================================================ */

const STATS = [
  { value: '12+', label: 'Years in the industry' },
  { value: '4.9', label: 'Average Google rating' },
  { value: '15', label: 'Trained professionals on the floor' },
];

function LeadingTheWaySection() {
  const reveal = useStaggeredReveal(3, 0.2);
  return (
    <section
      id="leading"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[6] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        <div style={reveal.getAnimStyle(0)}>
          <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#121014]/60">
            Leading the way
          </span>
        </div>
        <div className="mt-10 md:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-8">
          {STATS.map((stat, i) => (
            <div key={stat.label} style={reveal.getAnimStyle(i)} className="text-center sm:text-left">
              <p className="font-[Bodoni_Moda] text-6xl md:text-7xl leading-none text-[#121014]">
                {stat.value}
              </p>
              <p className="mt-3 text-sm md:text-base text-[#121014]/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Salon best things                                              */
/* ============================================================ */

const BEST_THINGS = [
  {
    title: 'Premium products',
    desc: 'Only professional-grade, cruelty-free lines make it onto our shelves.',
  },
  {
    title: 'Expert team',
    desc: 'Every stylist trained in-house on the Eon cutting and colour method.',
  },
  {
    title: 'Customised service',
    desc: 'No fixed script — every visit starts with a real consultation.',
  },
  {
    title: 'Tranquil ambiance',
    desc: 'Daylight, quiet music, and a room built to slow down in.',
  },
];

function ScissorIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0 mt-1 text-[#DDE3E2]"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="18" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.3 8 20 19.5M20 4.5 8.3 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SalonBestThingsSection() {
  const reveal = useStaggeredReveal(5, 0.15);
  return (
    <section
      id="best-things"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[7] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-[#000000]"
    >
      <div className="max-w-6xl mx-auto">
        <div style={reveal.getAnimStyle(0)}>
          <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#C9C9C9]">
            Why Eon
          </span>
          <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#DDE3E2]">
            What makes the chair worth it.
          </h2>
        </div>
        <div className="mt-10 md:mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <ul className="space-y-6 md:space-y-8">
            {BEST_THINGS.map((item, i) => (
              <li
                key={item.title}
                style={reveal.getAnimStyle(i)}
                className="flex items-start gap-4"
              >
                <ScissorIcon />
                <div>
                  <h3 className="font-[Bodoni_Moda] text-xl md:text-2xl text-[#DDE3E2]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm md:text-base text-[#6E7574] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div
            style={reveal.getImageAnimStyle(4)}
            className="relative rounded-xl md:rounded-2xl overflow-hidden bg-[#000000] aspect-[4/5] lg:aspect-[3/4]"
          >
            <AssetImage
              src={BEST_THINGS_IMG}
              alt="Inside Eon Salon"
              className="w-full h-full object-cover"
            />
            <LocationBadge path={BEST_THINGS_IMG} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* ACT IV — Studio and booking                                    */
/* ============================================================ */

function ArrowIcon({ light }: { light: boolean }) {
  return (
    <span
      className={`self-end w-9 h-9 md:w-12 md:h-12 rounded-full border flex items-center justify-center ${
        light ? 'border-[#DDE3E2] text-[#DDE3E2]' : 'border-[#000000] text-[#000000]'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="rotate-[-45deg]">
        <path
          d="M1 7h12m0 0L8 2m5 5L8 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function StudioSection() {
  const reveal = useStaggeredReveal(4, 0.15);

  return (
    <section
      id="studio"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[8] min-h-screen md:h-screen w-full overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2 bg-white"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div
            className="rounded-xl md:rounded-2xl bg-[#000000] p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0"
            style={reveal.getAnimStyle(0)}
          >
            <h2 className="text-[clamp(3rem,7vw,6.5rem)] font-[Bodoni_Moda] leading-[0.95] text-[#DDE3E2]">
              Inside
              <br />
              the studio
            </h2>
            <p className="text-xs md:text-sm font-semibold text-[#6E7574]">
              Daylight, ten chairs, no music you have to shout over
            </p>
          </div>

          <div
            className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
            style={reveal.getImageAnimStyle(1)}
          >
            <div className="relative flex-1 rounded-xl md:rounded-2xl overflow-hidden bg-[#000000]">
              <AssetImage
                src={STUDIO_IMG_1}
                alt="Stylist cutting at the mirror station"
                className="w-full h-full object-cover"
              />
              <LocationBadge path={STUDIO_IMG_1} />
            </div>
            <div className="relative flex-1 rounded-xl md:rounded-2xl overflow-hidden bg-[#000000]">
              <AssetImage
                src={STUDIO_IMG_2}
                alt="Colour being mixed at the bar"
                className="w-full h-full object-cover"
              />
              <LocationBadge path={STUDIO_IMG_2} />
            </div>
          </div>

          <div
            className="rounded-xl md:rounded-2xl bg-[#000000] p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0"
            style={reveal.getAnimStyle(2)}
          >
            <div>
              <p className="text-xs md:text-sm font-semibold text-[#6E7574] mb-2 md:mb-3">
                Booking
              </p>
              <h3 className="text-xl md:text-3xl font-[Bodoni_Moda] text-[#DDE3E2] leading-6 md:leading-8">
                Pick a chair,
                <br />
                pick a time
              </h3>
            </div>
            <button
              type="button"
              className="px-5 py-3 md:px-8 md:py-5 bg-[#DDE3E2] rounded-full text-[#000000] text-base md:text-xl font-bold hover:scale-105 transition-transform"
            >
              Book online
            </button>
          </div>
        </div>

        <div
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0 bg-[#000000]"
          style={reveal.getImageAnimStyle(3)}
        >
          <AssetImage
            src={STUDIO_TALL}
            alt="Client after a cut, mirror behind"
            className="w-full h-full object-cover"
          />
          <LocationBadge path={STUDIO_TALL} />
          <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
            <button
              type="button"
              aria-label="How a first appointment runs"
              className="flex-1 bg-[#DDE3E2] rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 text-left"
            >
              <h4 className="text-lg md:text-2xl font-[Bodoni_Moda] text-[#000000] leading-5 md:leading-7">
                How a first
                <br />
                appointment
                <br />
                runs
              </h4>
              <ArrowIcon light={false} />
            </button>
            <button
              type="button"
              aria-label="Looking after colour at home"
              className="flex-1 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52 text-left"
            >
              <h4 className="text-lg md:text-2xl font-[Bodoni_Moda] text-[#DDE3E2] leading-5 md:leading-7">
                Looking after
                <br />
                colour at
                <br />
                home
              </h4>
              <ArrowIcon light={true} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Store location                                                 */
/* ============================================================ */

function StoreLocationSection() {
  const reveal = useStaggeredReveal(6, 0.1);
  return (
    <section
      id="location"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[9] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-white"
    >
      <div className="max-w-6xl mx-auto">
        <div style={reveal.getAnimStyle(0)}>
          <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#000000]/60">
            Our store
          </span>
          <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#000000]">
            Find the studio.
          </h2>
          <p className="mt-4 text-sm md:text-base text-[#000000]/70">
            Eon salon Opposite to Indira national school sani mandir rod, Shani Mandir Rd,
            Tathawade, Pimpri-Chinchwad, Maharashtra 411033
          </p>
        </div>
        <div className="mt-8 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <a
            href={`tel:${PHONE_NUMBER}`}
            style={reveal.getAnimStyle(1)}
            className="flex flex-col gap-3 rounded-xl md:rounded-2xl bg-[#000000] p-4 md:p-5 text-[#DDE3E2] hover:bg-[#000000]/85 transition-colors"
          >
            <PhoneIcon />
            <div>
              <span className="block font-[Space_Mono] text-[10px] uppercase tracking-[0.12em] text-[#6E7574]">
                Call
              </span>
              <span className="text-sm md:text-base font-medium">{PHONE_NUMBER}</span>
            </div>
          </a>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            style={reveal.getAnimStyle(2)}
            className="flex flex-col gap-3 rounded-xl md:rounded-2xl bg-[#000000] p-4 md:p-5 text-[#DDE3E2] hover:bg-[#000000]/85 transition-colors"
          >
            <WhatsAppIcon />
            <div>
              <span className="block font-[Space_Mono] text-[10px] uppercase tracking-[0.12em] text-[#6E7574]">
                WhatsApp
              </span>
              <span className="text-sm md:text-base font-medium">{PHONE_NUMBER}</span>
            </div>
          </a>
          <a
            href={`mailto:${EMAIL_ADDRESS}`}
            style={reveal.getAnimStyle(3)}
            className="flex flex-col gap-3 rounded-xl md:rounded-2xl bg-[#000000] p-4 md:p-5 text-[#DDE3E2] hover:bg-[#000000]/85 transition-colors"
          >
            <MailIcon />
            <div>
              <span className="block font-[Space_Mono] text-[10px] uppercase tracking-[0.12em] text-[#6E7574]">
                Email
              </span>
              <span className="text-sm md:text-base font-medium break-all">{EMAIL_ADDRESS}</span>
            </div>
          </a>
          <div
            style={reveal.getAnimStyle(4)}
            className="flex flex-col gap-3 rounded-xl md:rounded-2xl bg-[#000000] p-4 md:p-5 text-[#DDE3E2]"
          >
            <ClockIcon />
            <div>
              <span className="block font-[Space_Mono] text-[10px] uppercase tracking-[0.12em] text-[#6E7574]">
                Hours
              </span>
              <span className="text-sm md:text-base font-medium">{STORE_HOURS}</span>
            </div>
          </div>
        </div>
        <div
          style={reveal.getImageAnimStyle(5)}
          className="mt-8 md:mt-10 rounded-xl md:rounded-2xl overflow-hidden bg-[#000000] aspect-video md:aspect-[21/9]"
        >
          <iframe
            title="Eon Salon location"
            src={MAP_EMBED_SRC}
            className="w-full h-full border-0 grayscale contrast-125"
            loading="eager"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Brands we use                                                  */
/* ============================================================ */

const BRANDS = [
  "L'Oréal Professionnel",
  'Wella Professionals',
  'Schwarzkopf',
  'Kérastase',
  'Olaplex',
  'Moroccanoil',
  'GK Hair',
  'Matrix',
];

function BrandsMarqueeSection() {
  const reveal = useStaggeredReveal(1, 0.15);
  const track = [...BRANDS, ...BRANDS];
  return (
    <section
      id="brands"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[10] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center py-14 md:py-20 bg-[#000000]"
    >
      <div style={reveal.getAnimStyle(0)}>
        <p className="text-center font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#C9C9C9] mb-8 md:mb-10">
          Brands we use
        </p>
        <div className="marquee-track">
          {track.map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className="flex items-center gap-8 md:gap-12 font-[Bodoni_Moda] text-2xl md:text-4xl text-[#DDE3E2]/70 pr-8 md:pr-12"
            >
              {brand}
              <span className="text-[#6E7574]" aria-hidden="true">
                ●
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* Google reviews                                                 */
/* ============================================================ */

const REVIEWS = [
  {
    name: 'Ananya R.',
    rating: 5,
    quote: 'Best haircut I have had in Pune. The consultation actually mattered.',
  },
  {
    name: 'Rohit K.',
    rating: 5,
    quote: 'Balayage grew out exactly the way they said it would. Worth every rupee.',
  },
  {
    name: 'Meera S.',
    rating: 5,
    quote: 'Calm space, no upselling, and they respected my time.',
  },
];

function GoogleReviewSection() {
  const reveal = useStaggeredReveal(3, 0.15);
  return (
    <section
      id="reviews"
      ref={reveal.containerRef}
      className="scroll-mt-20 sticky top-0 z-[11] min-h-screen overflow-hidden rounded-t-[2rem] md:rounded-t-[3rem] flex flex-col justify-center px-4 md:px-10 py-20 md:py-28 bg-[#000000]"
    >
      <SectionVideoBackground src={STUDIO_VIDEO} />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div style={reveal.getAnimStyle(0)}>
          <span className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] text-[#C9C9C9]">
            ★ 4.9 · Google reviews
          </span>
          <h2 className="mt-4 font-[Bodoni_Moda] text-4xl md:text-6xl leading-[0.95] text-[#DDE3E2]">
            What clients say.
          </h2>
        </div>
        <div className="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {REVIEWS.map((review, i) => (
            <div
              key={review.name}
              style={reveal.getAnimStyle(i)}
              className="rounded-xl md:rounded-2xl bg-[#000000] p-6 md:p-7 border border-white/10"
            >
              <p className="font-[Space_Mono] text-sm text-[#DDE3E2] tracking-[0.1em]" aria-hidden="true">
                {'★'.repeat(review.rating)}
              </p>
              <p className="mt-4 text-sm md:text-base text-[#DDE3E2]/85 leading-relaxed">
                “{review.quote}”
              </p>
              <p className="mt-5 font-[Space_Mono] text-xs uppercase tracking-[0.12em] text-[#6E7574]">
                {review.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer
      id="contact"
      className="scroll-mt-20 relative z-[12] rounded-t-[2rem] md:rounded-t-[3rem] px-3 md:px-5 pb-6 pt-10 flex flex-col md:flex-row md:items-end justify-between gap-6 text-[#6E7574] bg-[#000000]"
    >
      <p className="font-[Bodoni_Moda] text-4xl md:text-6xl text-[#DDE3E2]">Eon Salon</p>
      <div className="font-[Space_Mono] text-[11px] uppercase tracking-[0.14em] leading-relaxed">
        <p>Opp. Indira National School, Shani Mandir Rd, Tathawade, Pimpri-Chinchwad 411033</p>
        <p>Mon–Sun, 10am–9pm</p>
        <p>© 2026 Eon Salon</p>
      </div>
    </footer>
  );
}

/* ============================================================ */
/* App                                                             */
/* ============================================================ */

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <div className="bg-[#000000]" id="top">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <Navbar />
      <BookNowButton />
      <CinemaAct />
      <OurValuesSection />
      <LookbookSection />
      <OurWorksSection />
      <InstagramReelSection />
      <PriceSection />
      <LeadingTheWaySection />
      <SalonBestThingsSection />
      <StudioSection />
      <StoreLocationSection />
      <BrandsMarqueeSection />
      <GoogleReviewSection />
      <SiteFooter />
    </div>
  );
}

export default App;
