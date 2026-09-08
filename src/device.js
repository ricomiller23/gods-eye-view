/**
 * Mobile device detection utility.
 * Distinguishes handheld mobile devices (iOS iPhones/iPads, Android phones/tablets)
 * from desktop and laptop environments.
 * Used to tune WebGL buffer allocation, tile cache limits, and 3D model counts
 * so mobile browsers remain safely below OS memory termination limits (iOS Jetsam).
 *
 * @param {object} [options] Optional environment overrides for testing
 * @param {Navigator} [options.nav]
 * @param {Window} [options.win]
 * @returns {boolean}
 */
export function isMobileDevice(options = {}) {
  const win = options.win || (typeof window !== 'undefined' ? window : null);
  const nav = options.nav || (typeof navigator !== 'undefined' ? navigator : null);
  if (!win && !nav) return false;

  const ua = nav?.userAgent || nav?.vendor || '';
  const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i.test(ua);
  const isIPad = /iPad/i.test(ua) || ((nav?.maxTouchPoints || 0) > 1 && /Macintosh/i.test(ua));
  const isTouchDevice = (nav?.maxTouchPoints || 0) > 1;
  const isSmallScreen = typeof win?.matchMedia === 'function' && win.matchMedia('(max-width: 1024px)').matches;
  return Boolean(isMobileUA || isIPad || (isTouchDevice && isSmallScreen));
}
