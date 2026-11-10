import {useEffect, useRef} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {isActive, NAV} from './nav';

// How far a sideways swipe must go to change tab (px).
const SWIPE = 60;
// Near the screen's sides a swipe belongs to the system (back and forward).
const SIDE_MARGIN = 24;
// How far the finger moves before the swipe knows if it goes sideways (a tab) or down (a scroll).
const SLOP = 10;
// The page follows the finger half as far, and barely toward a side with no more tabs.
const FOLLOW = 0.5;
const EDGE_FOLLOW = 0.15;
// After a swipe the page leaves to the side, then the next one comes in from the other side.
const LEAVE_MS = 100;
const ENTER_MS = 200;
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

// Where a sideways drag already does something of its own: fields, sliders, maps, charts,
// open dialogs and anything that scrolls sideways.
const OWN_DRAG = 'input, textarea, select, [role="slider"], [role="dialog"], .leaflet-container, .recharts-wrapper';

const canSwipeFrom = (target: EventTarget | null): boolean => {
  for (let element = target instanceof Element ? target : null; null !== element; element = element.parentElement) {
    if (element.matches(OWN_DRAG)) return false;
    const {overflowX} = getComputedStyle(element);
    if (('auto' === overflowX || 'scroll' === overflowX) && element.scrollWidth > element.clientWidth) return false;
  }

  return true;
};

/** Moves the page by `offset` pixels, fading it a little as it goes. */
const follow = (frame: HTMLElement, offset: number) => {
  frame.style.transform = `translateX(${offset}px)`;
  frame.style.opacity = String(Math.max(0.5, 1 - Math.abs(offset) / 300));
};

/** Puts the page back in place, smoothly from wherever the finger left it. */
const settle = (frame: HTMLElement) => {
  const from = {transform: frame.style.transform || 'none', opacity: frame.style.opacity || '1'};
  frame.style.transform = '';
  frame.style.opacity = '';
  frame.animate([from, {transform: 'none', opacity: 1}], {duration: 180, easing: EASE_OUT});
};

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

/** Slides the page out toward `step` (1: the next tab, to the left), changes tab, and slides the new page in. */
const slide = async (frame: HTMLElement, step: number, change: () => void) => {
  const distance = window.innerWidth * 0.3;
  await frame.animate([{transform: `translateX(${-step * distance}px)`, opacity: 0}], {
    duration: LEAVE_MS,
    easing: 'ease-in',
    fill: 'forwards',
  }).finished;
  change();
  // The router draws the new page on its own time: give it two frames before it comes in.
  await nextFrame();
  await nextFrame();
  for (const animation of frame.getAnimations()) animation.cancel();
  frame.style.transform = '';
  frame.style.opacity = '';
  frame.animate(
    [
      {transform: `translateX(${step * distance}px)`, opacity: 0},
      {transform: 'none', opacity: 1},
    ],
    {duration: ENTER_MS, easing: EASE_OUT},
  );
};

/**
 * On a phone, a sideways swipe on a tab's page opens the next tab (to the left) or the one
 * before (to the right), in the tab bar's order, as Tillroll does: the page follows the
 * finger, then slides out as the next one slides in (no motion with Reduce motion). Pages
 * with no tab of their own (an activity, the settings) stay put. Returns the ref to put on
 * the page's frame.
 */
const useTabSwipe = <FrameElement extends HTMLElement>() => {
  const ref = useRef<FrameElement>(null);
  const navigate = useNavigate();
  const {pathname} = useLocation();
  // The latest page, so the touch listeners added once always use it.
  const latest = useRef({pathname, navigate});
  useEffect(() => {
    latest.current = {pathname, navigate};
  });

  useEffect(() => {
    const frame = ref.current;
    if (null === frame) return;
    const tabs = NAV.filter(({onPhone}) => onPhone);
    const currentTab = () => tabs.findIndex(({to}) => isActive(to, latest.current.pathname));
    /** The tab a swipe of `across` pixels leads to, if there is one that way. */
    const neighbour = (across: number) => {
      const current = currentTab();

      return -1 === current ? undefined : tabs[current + (across < 0 ? 1 : -1)];
    };

    let start: {left: number; top: number} | null = null;
    // Sideways for sure: the page follows the finger and does not scroll.
    let dragging = false;
    let still = false;
    let sliding = false;

    const onStart = (event: TouchEvent) => {
      start = null;
      dragging = false;
      if (sliding || 1 !== event.touches.length || -1 === currentTab()) return;
      const [{clientX, clientY}] = event.touches;
      if (clientX < SIDE_MARGIN || clientX > window.innerWidth - SIDE_MARGIN || !canSwipeFrom(event.target)) return;
      start = {left: clientX, top: clientY};
      still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };
    const onMove = (event: TouchEvent) => {
      if (null === start) return;
      const across = event.touches[0].clientX - start.left;
      const down = event.touches[0].clientY - start.top;
      if (!dragging) {
        if (Math.abs(across) < SLOP && Math.abs(down) < SLOP) return;
        // A scroll down the page that drifts a little never changes tab.
        if (Math.abs(across) <= Math.abs(down)) {
          start = null;
          return;
        }
        dragging = true;
      }
      if (event.cancelable) event.preventDefault();
      if (!still) follow(frame, across * (undefined === neighbour(across) ? EDGE_FOLLOW : FOLLOW));
    };
    const onEnd = async (event: TouchEvent) => {
      if (null === start || !dragging) {
        start = null;
        return;
      }
      const across = event.changedTouches[0].clientX - start.left;
      start = null;
      dragging = false;
      const next = Math.abs(across) >= SWIPE ? neighbour(across) : undefined;
      if (undefined === next) {
        if (!still) settle(frame);
        return;
      }
      const go = () => {
        void latest.current.navigate(next.to);
      };
      if (still) {
        go();
        return;
      }
      sliding = true;
      try {
        await slide(frame, across < 0 ? 1 : -1, go);
      } finally {
        sliding = false;
      }
    };
    const onCancel = () => {
      if (dragging && !still) settle(frame);
      start = null;
      dragging = false;
    };

    frame.addEventListener('touchstart', onStart, {passive: true});
    // Not passive: once a swipe goes sideways, it stops the page from scrolling.
    frame.addEventListener('touchmove', onMove, {passive: false});
    frame.addEventListener('touchend', onEnd);
    frame.addEventListener('touchcancel', onCancel);

    return () => {
      frame.removeEventListener('touchstart', onStart);
      frame.removeEventListener('touchmove', onMove);
      frame.removeEventListener('touchend', onEnd);
      frame.removeEventListener('touchcancel', onCancel);
    };
  }, []);

  return ref;
};

export {useTabSwipe};
