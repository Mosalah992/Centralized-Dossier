// The Fluent provider, and the only place in the app that mounts one.
//
// THIS MODULE IS LAZY ON PURPOSE, AND THE REASON IS THE GATE. A reader who
// never gets past the seal should download a passphrase box and nothing else —
// that is why App.tsx lazy-loads every volume, and Fluent is far heavier than
// any of them. So the provider is not at the root of the app where a provider
// normally goes. It is imported by App.tsx through React.lazy and rendered only
// inside the volume branch, which means:
//
//   - the gate renders with no Fluent in the bundle at all;
//   - so does the shelf;
//   - Fluent arrives with the first volume a reader opens, in the same
//     Suspense boundary that volume was already waiting in.
//
// If this ever moves up the tree, the index chunk grows and the gate pays for
// a library it does not use. The bundle check in the plan exists to catch that.

import {
  FluentProvider,
  Toast,
  ToastBody,
  ToastTitle,
  Toaster,
  makeStyles,
  tokens,
  useToastController,
} from '@fluentui/react-components';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { fluentThemeFor } from './theme';
import { GATE_SEALED_EVENT, RESEAL_GRACE_MS } from '../api';
import type { VolumeSlug } from '../../../shared/types';

/**
 * The one id every toast in the archive is addressed to. Exported so the view
 * raising a toast and the Toaster receiving it cannot drift apart.
 */
export const TOASTER_ID = 'embassy-toaster';

const useStyles = makeStyles({
  /*
   * FluentProvider paints colorNeutralBackground1 onto its own root div. That
   * token has to stay parchment — it is the fill of the input fields — but as a
   * flat wash across the whole page it would cover the six stacked gradients
   * ledger.css builds the parchment out of, and the page would go plain.
   *
   * So the root is made transparent and the page shows through. The token keeps
   * doing its real job inside the controls.
   */
  root: {
    backgroundColor: 'transparent',

    /*
     * Stated, not inherited — and that distinction cost a bug.
     *
     * FluentProvider copies this class onto the mount node of every portal it
     * opens (applyStylesToPortals), and those nodes hang off <body>, not off
     * the page. `color: inherit` there resolves against body, which base.css
     * sets to --stone for the hall: pale stone text on a parchment listbox,
     * which is very nearly no text at all. In the page itself it looked right
     * only because .page happens to set --ink further down.
     *
     * The token is the same ink either way. Naming it means the dropdown reads
     * the same whether it renders in the page or above it.
     */
    color: tokens.colorNeutralForeground1,
  },
});

/**
 * Says why the archive is closing, in the moment before it closes.
 *
 * A writ lapses mid-read and the reader is returned to the seal. Until now that
 * happened without a word: the page they were reading became the gate, which
 * looks exactly like being thrown out for cause. This is the sentence that was
 * missing.
 *
 * It can live here, inside a provider that only exists behind the gate, because
 * of where GATE_SEALED_EVENT is actually raised — every one of the three sites
 * in api.ts is a fetch made from inside an open volume. There is no path by
 * which the archive reseals while this is unmounted.
 */
function ResealNotice() {
  const { dispatchToast } = useToastController(TOASTER_ID);

  useEffect(() => {
    const said = () =>
      dispatchToast(
        <Toast>
          {/* No media slot. Fluent would put one of its own status glyphs here,
              and the Embassy says things in words. */}
          <ToastTitle media={null}>The writ has lapsed</ToastTitle>
          <ToastBody>
            Your leave to read has run out. The archive is sealing behind you.
          </ToastBody>
        </Toast>,
        { timeout: RESEAL_GRACE_MS, politeness: 'assertive' },
      );

    window.addEventListener(GATE_SEALED_EVENT, said);
    return () => window.removeEventListener(GATE_SEALED_EVENT, said);
  }, [dispatchToast]);

  return null;
}

/**
 * Wraps one volume's contents. `slug` picks the theme, so the controls glint in
 * the gold that volume is actually bound in rather than in a house colour.
 */
export function FluentShell({ slug, children }: { slug: VolumeSlug; children: ReactNode }) {
  const styles = useStyles();

  return (
    <FluentProvider theme={fluentThemeFor(slug)} className={styles.root}>
      {children}
      <ResealNotice />
      {/*
        Bottom-left, away from the footer's creed and from the return link at the
        top of every volume. `pauseOnHover` is off: the only thing that speaks
        here is the writ expiring, and that message should not be able to hold
        the gate open because a cursor happened to be resting on it.
      */}
      <Toaster toasterId={TOASTER_ID} position="bottom-start" pauseOnHover={false} />
    </FluentProvider>
  );
}
