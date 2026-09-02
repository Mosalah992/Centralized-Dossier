// The Fluent provider, and the only place in the app that mounts one.
//
// THIS MODULE IS LAZY ON PURPOSE. Fluent is far heavier than anything else in
// the project, and only the volumes use it. So the provider is not at the root
// of the app where a provider normally goes: it is imported by App.tsx through
// React.lazy and rendered only inside the volume branch, which means:
//
//   - the shelf renders with no Fluent in the bundle at all;
//   - Fluent arrives with the first volume a reader opens, in the same
//     Suspense boundary that volume was already waiting in.
//
// The argument used to be made about the gate, where a reader who never got
// past the seal downloaded a passphrase box and nothing else. The gate is gone
// and the shelf inherits the point: it is the first screen, it uses none of
// this, and if the provider moves up the tree every reader pays for a library
// they may never reach. test/bundle.test.ts is what catches that.

import {
  FluentProvider,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import type { ReactNode } from 'react';

import { fluentThemeFor } from './theme';
import type { VolumeSlug } from '../../../shared/types';

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

/*
 * A ResealNotice stood here, with a Toaster under it in every volume.
 *
 * It said "the writ has lapsed" in the beat before a reader whose writ had
 * expired was returned to the seal — a sentence that existed so the page they
 * were reading did not simply become the gate, which looks exactly like being
 * thrown out for cause. Nothing can lapse now, and it was the only thing in the
 * archive that ever raised a toast, so the Toaster went with it rather than
 * being kept in every volume against a message that can no longer arrive.
 */

/**
 * Wraps one volume's contents. `slug` picks the theme, so the controls glint in
 * the gold that volume is actually bound in rather than in a house colour.
 */
export function FluentShell({ slug, children }: { slug: VolumeSlug; children: ReactNode }) {
  const styles = useStyles();

  return (
    <FluentProvider theme={fluentThemeFor(slug)} className={styles.root}>
      {children}
    </FluentProvider>
  );
}
