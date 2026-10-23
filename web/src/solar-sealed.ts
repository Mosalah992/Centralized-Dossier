// What the room and the Solar tell one another across the scene change. They
// are separate chunks with nothing mounted between them, so each note is a
// module-level flag: set by one side on its way out, read by the other as it
// mounts, and cleared once read.
//
//   sealed    a reader reached /solar without the Solar's writ and is sent back
//             to the room, where Ancarion's plate should be waiting for them.
//   admitted  Ancarion has just let the reader through, so the Solar can open
//             at once instead of asking the server again first.
//
// Read and cleared in two steps, not one: React may run a state initializer
// twice in development, and a flag cleared by the first run would be gone by
// the second.

const flags = { sealed: false, admitted: false };
type Flag = keyof typeof flags;

export const mark = (flag: Flag) => {
  flags[flag] = true;
};
export const peek = (flag: Flag) => flags[flag];
export const clear = (flag: Flag) => {
  flags[flag] = false;
};

export const markSolarSealed = () => mark('sealed');
export const solarWasSealed = () => peek('sealed');
export const clearSolarSealed = () => clear('sealed');
