# Requirements

## Requirement: independent protected-volume authorization

Chronicles and Reports SHALL retain independent gate verification and session
behavior after the Ancarion portrait-gate change is imported.

#### Scenario: Chronicle authorization does not open Reports

- **WHEN** a reader successfully authorizes the Chronicle route
- **THEN** the Reports route still requires its own authorization

#### Scenario: Reports authorization does not open Chronicle

- **WHEN** a reader successfully authorizes the Reports route
- **THEN** the Chronicle route still requires its own authorization and keeps
  its private response headers

## Requirement: protected Chronicle delivery

The imported implementation SHALL not put Chronicle source text in the browser
bundle or relax the Chronicle cache contract.

#### Scenario: a Chronicle response is authorized

- **WHEN** the protected Chronicle endpoint returns content
- **THEN** it retains `Cache-Control: private, no-store` and `Vary: Cookie`
