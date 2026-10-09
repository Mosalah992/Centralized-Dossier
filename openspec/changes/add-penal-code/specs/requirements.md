# Requirements

- `/penalcode` (case-insensitive) renders the Penal Code; other paths are unchanged.
- The Code's text ships in a lazily loaded chunk, never in the entry bundle.
- Every article shows its number, title, charge class and definition; the
  felony/misdemeanor distinction is conveyed in text, not colour alone.
- The table of contents moves focus to the chosen part.
- The hall top bar's "Penal Code" entry is a real link to `/penalcode`.
- The page honours reduced motion and has a single `h1`.
