/** Two-set cache; each snapshot lists tags MRU first, not physical way IDs. */
export function simulate(blocks, ways) {
  if (!Number.isInteger(ways) || ways < 1 || ways > 4) throw new RangeError('ways must be 1 through 4');
  const sets = [[], []];
  return blocks.map(block => {
    if (!Number.isSafeInteger(block) || block < 0) throw new RangeError('block must be a nonnegative integer');
    const set = block % 2;
    const lines = sets[set];
    const rank = lines.indexOf(block);
    const hit = rank >= 0;
    if (hit) lines.splice(rank, 1);
    const evicted = !hit && lines.length === ways ? lines.at(-1) : null;
    lines.unshift(block);
    if (lines.length > ways) lines.pop();
    return { block, hit, set, evicted, resident: [...lines] };
  });
}
