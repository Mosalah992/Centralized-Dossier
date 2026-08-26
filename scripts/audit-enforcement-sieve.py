# Audit the sieve behind the Ledger of Enforcement: which of the 650 informant
# reports carry a coercive act, and does the set that was actually READ cover
# them?
#
# This exists because the first pass's sieve was written inline and thrown away,
# and could not afterwards be checked. It was checked eventually, and it had
# missed 81 reports — twelve of which held real acts, among them an agent cut
# down for asking to leave the Thalmor and a detachment of the Imperial Legion
# marched into the Embassy dungeons. A filter you cannot re-run is a filter you
# are trusting on its word.
#
# The net here is deliberately WIDER than any pass should need, because the
# failure mode is silent: a report dropped for want of a keyword leaves no trace
# in the output. Over-matching costs a read; under-matching costs an act.
#
# It reads docs/informant-reports.md (gitignored, regenerate with
# scripts/build-informant-history.mjs) and compares against the candidate set in
# tmp/enforce/. Both are held back from this repository; this file is only the
# sieve, and carries no record text.
#
#     python scripts/audit-enforcement-sieve.py

import io, re, sys
from collections import OrderedDict

sys.stdout.reconfigure(encoding='utf-8')

src = io.open('docs/informant-reports.md', encoding='utf-8').read()

# Reports are "#### Agent — date" followed by everything up to the next heading.
REPORT = re.compile(r'\n#### (?P<agent>[^\n]+)\n(?P<body>.*?)(?=\n#{3,4} |\Z)', re.S)
reports = [(m.group('agent').strip(), m.group('body')) for m in REPORT.finditer(src)]
print('reports parsed from source:', len(reports))

# The wide net. Anything that could plausibly describe a coercive act, including
# spellings and near-misses the first pass would not have thought of.
TERMS = [
    r'arrest', r'apprehend', r'detain', r'\bdetention\b', r'\bcuff', r'\bin custody\b',
    r'\bcustody\b', r'execut', r'\bput to (?:the sword|death)\b', r'\bbeheade?d?\b',
    r'\bhange?d?\b', r'\bkilled\b', r'\bcut (?:him|her|them|down)\b', r'\bslain\b',
    r'\bslew\b', r'\bstruck down\b', r'\bfelled\b', r'\bdispatched\b', r'\bneutrali[sz]ed\b',
    r'interrogat', r'\bquestion(?:ed|ing)\b', r'\btortur', r'\bfine[ds]?\b', r'\bfining\b',
    r'\bseptims? fine\b', r'\bconfiscat', r'\bsei[sz]ed?\b', r'\bimprison', r'\bcells?\b',
    r'\bdungeon', r'\bprisoner', r'\bbanish', r'\bexile', r'\bsentenc', r'\bpunish',
    r'\blabou?r\b', r'\blumber ?mill\b', r'\bsaw ?mill\b', r'\bdenounce', r'\brenounce',
    r'\bheretic', r'\bheresy\b', r'\bworshipper\b', r'\bwanted list\b', r'\bbounty\b',
    r'\bmanacle', r'\brestraints?\b', r'\bescorted\b', r'\btaken in\b', r'\bbrought in\b',
]
NET = re.compile('|'.join(TERMS), re.I)

hits = [(i, a, b) for i, (a, b) in enumerate(reports) if NET.search(b)]
print('reports matching the wide net:', len(hits))

# What was actually read: candidates.md, keyed by a fingerprint of its body so
# the comparison does not depend on indices lining up between two files.
cand = io.open('tmp/enforce/candidates.md', encoding='utf-8', errors='replace').read()
parts = re.split(r'(?m)^=== \[(\d+)\] ', cand)
read_bodies = OrderedDict()
for i in range(1, len(parts), 2):
    read_bodies[int(parts[i])] = parts[i + 1]

def fingerprint(text):
    """Longest run of alphanumerics, lowercased — stable across the heading and
    formatting differences between the two files."""
    words = re.findall(r'[a-z0-9]+', text.lower())
    return ' '.join(words[3:23])

read_prints = {fingerprint(b) for b in read_bodies.values()}

missed = []
for i, agent, body in hits:
    if fingerprint(body) not in read_prints:
        missed.append((i, agent, body))

print()
print('IN THE WIDE NET BUT NOT IN THE 195 READ:', len(missed))
io.open('tmp/enforce/missed.md', 'w', encoding='utf-8', newline='\n').write(
    '\n'.join('=== [%d] %s\n%s' % (i, a, b.strip()) for i, a, b in missed))
print('written to tmp/enforce/missed.md')
