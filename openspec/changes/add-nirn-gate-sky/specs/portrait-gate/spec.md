## Purpose
How the sealed volumes' shared portrait gate is presented, and the setting drawn behind the Reports gate.

## ADDED Requirements

### Requirement: Centred portrait gate
The portrait gate SHALL present Ancarion's portrait centred, with the passphrase field, its submit button and a status line beneath it, and SHALL NOT show a visible title, description or dialogue panel beside the portrait. The collection name, field label and Ancarion's line SHALL remain available to assistive technology.

#### Scenario: Reports gate
- **WHEN** a reader without a Reports writ opens `/reports`
- **THEN** the portrait is centred, the passphrase field and button sit beneath it, and no text panel is shown beside it

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the gate
- **THEN** it announces the collection name as a heading and the field as "Passphrase"

### Requirement: Nirn sky behind the Reports gate
The Reports gate SHALL draw Nirn, Masser and Secunda behind the centred portrait: a live three.js scene on wide, fine-pointer screens with WebGL2; a still plate for reduced motion, touch devices or no WebGL2; and nothing below 721px. The Chronicles gate SHALL NOT draw the sky.

#### Scenario: Desktop
- **WHEN** a desktop reader with WebGL2 opens `/reports`
- **THEN** the live sky is drawn behind the gate

#### Scenario: Reduced motion
- **WHEN** the reader prefers reduced motion
- **THEN** the still plate is shown instead of the live scene

### Requirement: The rest of Mundus in the Reports sky
The live Reports sky SHALL show Masser and Secunda orbiting Nirn, and Magnus with the eight Divine planets on the left, the Divines slowly orbiting Magnus, using the calendar orrery's sprites. The still plate SHALL show the same bodies at rest.

#### Scenario: Live sky over time
- **WHEN** the live sky has run for a while
- **THEN** the moons and the Divine planets have moved along their orbits, and no body crosses the portrait

### Requirement: Three.js stays out of the entry chunk
Three.js SHALL be reached only through `NirnSky`'s dynamic import, and the entry chunk SHALL NOT contain it.

#### Scenario: Built bundle
- **WHEN** the site is built
- **THEN** the entry chunk does not contain `__THREE__`
