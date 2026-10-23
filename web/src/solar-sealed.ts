// A reader who reaches /solar without the Solar's writ is turned back to the
// room, where Ancarion's plate should be waiting for their word. The Solar page
// and the room are separate chunks with nothing mounted between them, so the
// turn-back is handed across in this one flag: set by the Solar on its way out,
// read by the room as it mounts and cleared once it has.
//
// Read and cleared in two steps, not one: React may run a state initializer
// twice in development, and a flag cleared by the first run would be gone by
// the second.

let turnedBack = false;

export function markSolarSealed(): void {
  turnedBack = true;
}

export const solarWasSealed = (): boolean => turnedBack;

export function clearSolarSealed(): void {
  turnedBack = false;
}
