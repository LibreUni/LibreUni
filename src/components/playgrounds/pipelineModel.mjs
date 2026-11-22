export const program = ['lw r1,0(r2)', 'add r3,r1,r4', 'beq r3,r0,target', 'or r5,r6,r7'];
// Rows show stage occupancy during a cycle. Branch decisions and transfers
// take effect at its end. Full EX forwarding is assumed except for load-use.
export function schedule(taken) {
  let stages = [program[0], null, null, null, null];
  let fetchIndex = 1;
  const rows = [];
  for (let cycle = 1; cycle <= 20 && stages.some(Boolean); cycle += 1) {
    rows.push([String(cycle), ...stages.map(value => value ?? '—')]);
    const [fetch, decode, execute, memory] = stages;
    const loadUse = execute === program[0] && decode === program[1];
    const flush = execute === program[2] && taken;
    const nextInstruction = () => program[fetchIndex++] ?? null;
    if (loadUse) {
      stages = [fetch, decode, 'bubble', execute, memory];
    } else if (flush) {
      // Redirect fetch while squashing younger instructions, not older ones.
      stages = ['target', 'bubble', 'bubble', execute, memory];
      fetchIndex = program.length;
    } else {
      stages = [nextInstruction(), fetch, decode, execute, memory];
    }
    // Invalid entries need not keep a completely drained pipeline alive.
    if (stages.every(value => value === null || value === 'bubble')) break;
  }
  return rows;
}
