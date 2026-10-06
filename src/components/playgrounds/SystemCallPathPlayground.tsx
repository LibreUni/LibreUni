import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

type Stage = {
  actor: string;
  mode: 'user' | 'hardware' | 'kernel';
  action: string;
  state: string;
  invariant: string;
};

const stages: Stage[] = [
  {
    actor: 'Application',
    mode: 'user',
    action: 'Calls read(fd, buffer, 4)',
    state: 'PC is in the C library wrapper; the buffer is only a user virtual address.',
    invariant: 'User code cannot dereference kernel memory or program the disk controller.',
  },
  {
    actor: 'Library wrapper',
    mode: 'user',
    action: 'Places the call number and arguments in the ABI-defined registers',
    state: 'Registers describe read; no bytes have been read and no authority has been granted.',
    invariant: 'A wrapper prepares a request. It does not make the request trusted.',
  },
  {
    actor: 'RISC-V trap hardware',
    mode: 'hardware',
    action: 'Processes ecall, records sepc and scause, changes privilege, and jumps to stvec',
    state: 'General registers, the current stack pointer, and the page-table selection are not switched by hardware.',
    invariant: 'The protected trap vector must be able to run safely with the user register file and address-space context still active.',
  },
  {
    actor: 'xv6 trampoline entry',
    mode: 'kernel',
    action: 'Saves user registers in the trapframe, selects the kernel stack and page table, then calls C',
    state: 'The trapframe now preserves the user context; kernel code has a private stack and mappings.',
    invariant: 'Entry assembly must not destroy a user register before that register has been saved.',
  },
  {
    actor: 'Dispatcher and read handler',
    mode: 'kernel',
    action: 'Dispatches a valid call number, then resolves the descriptor and validates the count and user buffer',
    state: 'The kernel resolves fd to an open-file object and checks that copying out is legal.',
    invariant: 'Every user pointer and handle is untrusted until checked in the caller context.',
  },
  {
    actor: 'VFS and device path',
    mode: 'kernel',
    action: 'Reads cached data or blocks the thread while a device request completes',
    state: 'The thread may leave Running; another ready thread can use the CPU.',
    invariant: 'Blocking changes scheduling state without changing the process address-space identity.',
  },
  {
    actor: 'Kernel completion',
    mode: 'kernel',
    action: 'Copies completed bytes to the checked user range and records the result in the saved trapframe',
    state: 'The data and return value are committed before user registers or privilege are restored.',
    invariant: 'A failed copyout must not be reported as a successful read.',
  },
  {
    actor: 'Trampoline and sret',
    mode: 'hardware',
    action: 'Restores saved user registers; sret restores the selected privilege and program counter',
    state: 'The user PC resumes after the ecall; a0 contains 4 or an error.',
    invariant: 'Kernel-only state and privilege must not leak across the return boundary.',
  },
];

const modeStyle: Record<Stage['mode'], string> = {
  user: 'border-sky-500 bg-sky-500/10 text-sky-800 dark:text-sky-200',
  hardware: 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  kernel: 'border-violet-500 bg-violet-500/10 text-violet-800 dark:text-violet-200',
};

function Path({ step }: { step: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8" role="group" aria-label={`System-call path at stage ${step + 1} of ${stages.length}`}>
      {stages.map((stage, index) => (
        <div
          key={stage.actor}
          className={`relative min-h-24 rounded-xl border p-3 transition-all ${index === step ? `${modeStyle[stage.mode]} ring-2 ring-current ring-offset-2 ring-offset-light-surface dark:ring-offset-dark-surface` : 'border-light-border bg-light-bg/60 text-light-muted opacity-65 dark:border-dark-border dark:bg-dark-bg/40 dark:text-dark-muted'}`}
          aria-current={index === step ? 'step' : undefined}
        >
          <div className="text-[10px] font-black uppercase tracking-[0.12em]">{stage.mode}</div>
          <div className="mt-2 text-sm font-bold leading-tight">{stage.actor}</div>
          {index < stages.length - 1 && <span className="absolute -right-2 top-10 z-10 hidden text-lg xl:block" aria-hidden="true">→</span>}
        </div>
      ))}
    </div>
  );
}

export default function SystemCallPathPlayground() {
  const [step, setStep] = useState(0);
  const stage = stages[step];

  return (
    <InteractivePlayground
      title="Scrub through a read system call"
      description="Follow one xv6/RISC-V request across the ABI, hardware trap, trampoline, validation, blocking I/O, kernel completion, and architectural return. The active box shows who controls execution—not merely which function name appears in source."
      status={`Stage ${step + 1} of ${stages.length}: ${stage.mode} mode`}
      onReset={() => setStep(0)}
      staticContent={<Path step={4} />}
      staticCaption="At kernel dispatch, the call number, descriptor, byte count, and user address are validated before the kernel acts on the request."
    >
      <label className="interactive-playground-controls mb-5 grid gap-2 text-sm font-semibold">
        Execution stage: {step + 1} — {stage.actor}
        <input
          aria-label="System call execution stage"
          type="range"
          min="0"
          max={stages.length - 1}
          value={step}
          onChange={(event) => setStep(Number(event.target.value))}
        />
      </label>

      <Path step={step} />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-light-border bg-light-bg/70 p-4 dark:border-dark-border dark:bg-dark-bg/40">
          <h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-primary">Transition</h4>
          <p className="mb-0 mt-2 text-sm leading-relaxed">{stage.action}</p>
          <p className="mb-0 mt-2 font-mono text-xs leading-relaxed text-light-muted dark:text-dark-muted">{stage.state}</p>
        </section>
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h4 className="m-0 text-xs font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">Invariant to check</h4>
          <p className="mb-0 mt-2 text-sm leading-relaxed">{stage.invariant}</p>
        </section>
      </div>
    </InteractivePlayground>
  );
}
