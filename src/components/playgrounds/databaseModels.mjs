export function attributeClosure(seed, dependencies) {
  const result = new Set(seed);
  let changed = true;
  while (changed) {
    changed = false;
    for (const [left, right] of dependencies) {
      if (left.every((attribute) => result.has(attribute))) {
        for (const attribute of right) {
          if (!result.has(attribute)) { result.add(attribute); changed = true; }
        }
      }
    }
  }
  return [...result];
}

export function queryPlanCosts(pages, selectivity, customerPages = 100) {
  const matchingPages = Math.max(1, Math.ceil((pages * selectivity) / 100));
  return { matchingPages, costs: { 'scan-hash': pages + customerPages, 'index-hash': 3 + matchingPages + customerPages, 'index-nested': 3 + matchingPages + matchingPages * customerPages } };
}

export function quorumState(replicas, readQuorum, writeQuorum, unavailable) {
  const reachable = replicas - unavailable;
  return { reachable, intersects: readQuorum + writeQuorum > replicas, readAvailable: reachable >= readQuorum, writeAvailable: reachable >= writeQuorum };
}

export function lostUpdateState(step) {
  return { database: step >= 5 ? 1 : 0, lost: step === 6 };
}

export function recoveryState(durable) {
  return { committed: durable >= 5, t1UpdateLogged: durable >= 2, t2UpdateLogged: durable >= 4 };
}
