import {useEffect, useRef} from 'react';
import {useLocation, useNavigate} from 'react-router';
import {isActive, NAV} from './nav';

// A swipe moves at least this far sideways (px), at least twice as far as it moves up or
// down, and within this time (ms): a scroll or a slow drag is not one.
const SWIPE_DISTANCE = 70;
const SWIPE_TIME = 600;

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

/**
 * On a phone, a swipe left or right on a tab's page opens the next or the previous tab, in the
 * tab bar's order. Pages with no tab of their own (an activity, the settings) stay put.
 * Returns the ref to put on the page's frame.
 */
const useTabSwipe = <FrameElement extends HTMLElement>() => {
  const ref = useRef<FrameElement>(null);
  const navigate = useNavigate();
  const {pathname} = useLocation();

  useEffect(() => {
    const frame = ref.current;
    const tabs = NAV.filter(({onPhone}) => onPhone);
    const current = tabs.findIndex(({to}) => isActive(to, pathname));
    if (null === frame || -1 === current) return;

    let start: {x: number; y: number; time: number} | null = null;
    const onStart = (event: TouchEvent) => {
      const [touch] = event.touches;
      start =
        1 === event.touches.length && canSwipeFrom(event.target)
          ? {x: touch.clientX, y: touch.clientY, time: Date.now()}
          : null;
    };
    const onEnd = (event: TouchEvent) => {
      const [touch] = event.changedTouches;
      if (null === start || undefined === touch) return;
      const across = touch.clientX - start.x;
      const down = touch.clientY - start.y;
      const quick = Date.now() - start.time < SWIPE_TIME;
      start = null;
      if (!quick || Math.abs(across) < SWIPE_DISTANCE || Math.abs(across) < 2 * Math.abs(down)) return;
      // A drag that selected text was not a swipe.
      if ('' !== (window.getSelection()?.toString() ?? '')) return;

      const next = tabs[current + (across < 0 ? 1 : -1)];
      if (undefined !== next) navigate(next.to);
    };

    frame.addEventListener('touchstart', onStart, {passive: true});
    frame.addEventListener('touchend', onEnd, {passive: true});

    return () => {
      frame.removeEventListener('touchstart', onStart);
      frame.removeEventListener('touchend', onEnd);
    };
  }, [pathname, navigate]);

  return ref;
};

export {useTabSwipe};
