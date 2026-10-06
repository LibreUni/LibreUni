import { useMemo, useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Access = 'read' | 'write' | 'execute';
type Entry = { frame: number; permissions: string; present: boolean };

const tables: Record<string, Record<number, Entry>> = {
  A: {
    0x1: { frame: 0x5, permissions: 'r-x', present: true },
    0x4: { frame: 0x2, permissions: 'rw-', present: true },
    0x8: { frame: 0x0, permissions: 'rw-', present: false },
    0xc: { frame: 0x7, permissions: 'r--', present: true },
  },
  B: {
    0x1: { frame: 0x3, permissions: 'r-x', present: true },
    0x4: { frame: 0x9, permissions: 'rw-', present: true },
    0x8: { frame: 0x6, permissions: 'rw-', present: true },
    0xc: { frame: 0x7, permissions: 'r--', present: true },
  },
};

const tlb: Record<string, Record<number, Entry>> = {
  A: {
    0x4: tables.A[0x4],
    0xc: tables.A[0xc],
  },
  B: {
    0x1: tables.B[0x1],
  },
};

export function outcome(process: string, address: number, access: Access) {
  const vpn = address >> 8;
  const offset = address & 0xff;
  const entry = tables[process][vpn];
  const tlbEntry = tlb[process][vpn];
  const required = access === 'read' ? 'r' : access === 'write' ? 'w' : 'x';
  if (!entry || !entry.present) return { vpn, offset, entry, tlbHit: false, kind: 'page fault', physical: null, explanation: 'The mapping is absent or not present. The CPU traps before the memory access completes.' };
  if (!entry.permissions.includes(required)) return { vpn, offset, entry, tlbHit: Boolean(tlbEntry), kind: 'protection fault', physical: null, explanation: `The page is present, but ${entry.permissions} does not grant ${access} authority.` };
  const physical = (entry.frame << 8) | offset;
  return { vpn, offset, entry, tlbHit: Boolean(tlbEntry), kind: tlbEntry ? 'TLB hit' : 'page-table walk', physical, explanation: tlbEntry ? 'The ASID-tagged translation is cached; permissions are still checked.' : 'The hardware or kernel walks the page table, then may cache the translation.' };
}

const hex = (value: number, width = 3) => `0x${value.toString(16).toUpperCase().padStart(width, '0')}`;

function TranslationView({ process, address, access }: { process: string; address: number; access: Access }) {
  const result = outcome(process, address, access);
  const boxes = [
    { label: 'Virtual address', value: hex(address), detail: `VPN ${hex(result.vpn, 1)} · offset ${hex(result.offset, 2)}`, active: true },
    { label: 'TLB', value: result.tlbHit ? 'hit' : 'miss', detail: `ASID ${process}, VPN ${hex(result.vpn, 1)}`, active: result.tlbHit },
    { label: 'Page table', value: result.entry ? (result.entry.present ? `frame ${hex(result.entry.frame, 1)}` : 'not present') : 'unmapped', detail: result.entry ? `permissions ${result.entry.permissions}` : 'no PTE', active: !result.tlbHit },
    { label: 'Result', value: result.physical === null ? result.kind : hex(result.physical), detail: result.physical === null ? 'trap to kernel' : `${access} proceeds`, active: true },
  ];

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-4" role="group" aria-label={`Address translation result: ${result.kind}`}>
        {boxes.map((box, index) => (
          <section key={box.label} className={`relative rounded-xl border p-4 ${box.active ? 'border-primary/50 bg-primary/5' : 'border-light-border bg-light-bg/50 text-light-muted dark:border-dark-border dark:bg-dark-bg/40 dark:text-dark-muted'}`}>
            <div className="text-[10px] font-black uppercase tracking-[0.13em]">{box.label}</div>
            <div className="mt-2 break-words font-mono text-lg font-black">{box.value}</div>
            <div className="mt-1 text-xs">{box.detail}</div>
            {index < boxes.length - 1 && <span className="absolute -right-2 top-10 z-10 hidden md:block" aria-hidden="true">→</span>}
          </section>
        ))}
      </div>
      <div className={`mt-4 rounded-xl border p-4 text-sm ${result.kind.includes('fault') ? 'border-rose-500/35 bg-rose-500/5' : 'border-emerald-500/35 bg-emerald-500/5'}`}>
        <strong>{result.kind}.</strong> {result.explanation}
      </div>
    </div>
  );
}

export default function PageTablePlayground() {
  const [process, setProcess] = useState('A');
  const [address, setAddress] = useState(0x4a3);
  const [access, setAccess] = useState<Access>('read');
  const result = useMemo(() => outcome(process, address, access), [process, address, access]);

  return (
    <InteractivePlayground
      title="Translate a virtual address—or trigger a fault"
      description="This bounded 12-bit machine uses 256-byte pages. Change the process, access type, and address to expose ASID-tagged TLB hits, page-table walks, non-present pages, shared frames, and permission failures."
      status={`${hex(address)} → ${result.physical === null ? result.kind : hex(result.physical)}`}
      onReset={() => { setProcess('A'); setAddress(0x4a3); setAccess('read'); }}
      staticContent={<TranslationView process="A" address={0x4a3} access="read" />}
      staticCaption="Static state: process A reads 0x4A3. VPN 4 is cached and maps to frame 2, preserving offset 0xA3, so the physical address is 0x2A3."
    >
      <div className="interactive-playground-controls mb-5 grid gap-4 rounded-xl border border-light-border bg-light-bg/60 p-4 dark:border-dark-border dark:bg-dark-bg/40 md:grid-cols-[8rem_10rem_1fr] md:items-end">
        <label className="grid gap-1 text-sm font-semibold">Process
          <select aria-label="Address-space process" className="input-field" value={process} onChange={(event) => setProcess(event.target.value)}>
            <option value="A">Process A</option><option value="B">Process B</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">Access
          <select aria-label="Memory access type" className="input-field" value={access} onChange={(event) => setAccess(event.target.value as Access)}>
            <option value="read">Read</option><option value="write">Write</option><option value="execute">Execute</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Virtual address = {hex(address)}
          <input aria-label="Virtual address" type="range" min="0" max="4095" value={address} onChange={(event) => setAddress(Number(event.target.value))} />
        </label>
      </div>
      <TranslationView process={process} address={address} access={access} />
      <p className="mb-0 mt-4 text-xs leading-relaxed text-light-muted dark:text-dark-muted">Model scope: one-level page tables, 4-bit frame numbers, no huge pages, and a fixed TLB snapshot. Real 64-bit machines use multi-level tables and wider physical addresses; the VPN/offset and permission invariants are unchanged.</p>
    </InteractivePlayground>
  );
}
