# Cut the rubricated initial's face down to the letters it can ever draw.
#
#     pip install fonttools brotli
#     python scripts/prepare-initials.py
#
# BLACK CHANCERY IS USED FOR EXACTLY ONE THING: the large coloured capital that
# opens each entry in the Thalmor Chronicles. That is the whole of its remit and
# it must stay that way — see invariant 5 in CLAUDE.md. A calligraphic hand set
# at label size comes apart into disconnected strokes; it was tried once with
# Hesperides across the archive's small tracked capitals and reverted. What
# defeats it at 11px is exactly what makes it right at 3em and one letter.
#
# So the subset is the twenty-six capitals and nothing else. 56,732 bytes of TTF
# becomes about 5 kB of woff2, and because nothing outside the Chronicles asks
# for the face, no reader who does not open that volume ever fetches it.
#
# LICENCE. The file declares "Public domain" in its own name table, and
# Assets/BLACKCHA.TXT says the same: a calligraphic outline font by Earl Allen
# and Doug Miles, built on the public-domain Black Chancery bitmap face. That
# matters here because static assets in this project are served from public URLs
# — shipping a font distributes it to anyone holding the link.

import os
from fontTools import subset

SRC = 'Assets/BLKCHCRY.TTF'
OUT = 'web/src/assets/fonts/black-chancery-caps.woff2'

# Initials only. Not lowercase, not figures, not punctuation: the drop cap is
# always a capital, and every byte here is a byte the Chronicles' reader pays.
GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

options = subset.Options()
options.flavor = 'woff2'
options.desubroutinize = True
# No kerning, ligatures or contextual features survive: a single floated letter
# has nothing to kern against and nothing to form a ligature with.
options.layout_features = []
options.notdef_outline = False
options.recalc_bounds = True

font = subset.load_font(SRC, options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=GLYPHS)
subsetter.subset(font)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
subset.save_font(font, OUT, options)

print('%s  %d bytes -> %s  %d bytes'
      % (SRC, os.path.getsize(SRC), OUT, os.path.getsize(OUT)))
