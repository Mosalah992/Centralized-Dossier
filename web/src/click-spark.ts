// The gauntlet's spark: wherever the reader clicks, the fingertip strikes a
// brief gold spark (base.css, "The click spark"). A cursor image cannot move,
// so the spark is the page's: a span dropped at the pointer, animated by CSS
// and gone in a moment. It never takes a click itself.
//
// Only for a mouse or a pen, which are the pointers that wear the gauntlet; a
// finger on glass has no cursor to spark. Nothing at all for a reader who asks
// for less motion.

const LIFETIME_MS = 600;

export function installClickSpark(): void {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  window.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (event.button !== 0 || still.matches) return;

      const spark = document.createElement('span');
      spark.className = 'click-spark';
      spark.setAttribute('aria-hidden', 'true');
      spark.style.left = `${event.clientX}px`;
      spark.style.top = `${event.clientY}px`;
      document.body.appendChild(spark);
      window.setTimeout(() => spark.remove(), LIFETIME_MS);
    },
    { capture: true, passive: true },
  );
}
