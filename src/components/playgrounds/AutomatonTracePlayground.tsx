import { useState } from 'react';
import InteractivePlayground from '../InteractivePlayground';

const input = '101101';
const stateAfter = (prefix: string) => prefix.split('').filter((symbol) => symbol === '1').length % 2 === 0 ? 'q_even' : 'q_odd';

function Automaton({ position }: { position: number }) {
  const state = stateAfter(input.slice(0, position));
  return <svg viewBox="0 0 720 260" role="img" aria-label={`Parity automaton after reading ${position} symbols, in ${state}`} className="h-auto w-full text-light-text dark:text-dark-text">
    <defs><marker id="automaton-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker></defs>
    <path d="M295 105C335 40 385 40 425 105M425 155C385 220 335 220 295 155" fill="none" stroke="currentColor" strokeWidth="3" markerEnd="url(#automaton-arrow)" />
    <text x="360" y="54" textAnchor="middle" fontSize="16">read 1</text><text x="360" y="224" textAnchor="middle" fontSize="16">read 1</text>
    <path d="M240 92C180 34 150 96 220 115" fill="none" stroke="currentColor" strokeWidth="3" markerEnd="url(#automaton-arrow)" /><text x="153" y="68" fontSize="16">read 0</text>
    <path d="M480 92C540 34 570 96 500 115" fill="none" stroke="currentColor" strokeWidth="3" markerEnd="url(#automaton-arrow)" /><text x="520" y="68" fontSize="16">read 0</text>
    <circle cx="260" cy="130" r="54" fill={state === 'q_even' ? '#dbeafe' : 'transparent'} stroke="#3b82f6" strokeWidth={state === 'q_even' ? 6 : 3} /><circle cx="460" cy="130" r="54" fill={state === 'q_odd' ? '#dbeafe' : 'transparent'} stroke="#3b82f6" strokeWidth={state === 'q_odd' ? 6 : 3} />
    <circle cx="260" cy="130" r="45" fill="none" stroke="currentColor" strokeWidth="2" /><text x="260" y="136" textAnchor="middle" fontSize="17" fontWeight="700">q_even</text><text x="460" y="136" textAnchor="middle" fontSize="17" fontWeight="700">q_odd</text>
    <text x="360" y="254" textAnchor="middle" fontSize="16">{input.split('').map((symbol, index) => index < position ? `✓${symbol}` : symbol).join('  ')}</text>
  </svg>;
}

export default function AutomatonTracePlayground() {
  const [position, setPosition] = useState(0);
  const prefix = input.slice(0, position) || 'ε';
  return <InteractivePlayground
    title="Trace the semantic meaning of a DFA state"
    description="The machine recognizes strings containing an even number of 1s. The selected state summarizes the entire consumed prefix."
    status={`prefix ${prefix} → ${stateAfter(input.slice(0, position))}`}
    staticCaption="The DFA state records whether the consumed prefix contains an even or odd number of 1s."
    staticContent={<Automaton position={4} />}
  >
    <label className="interactive-playground-controls grid gap-2 text-sm font-semibold">Symbols consumed = {position} of {input.length}<input aria-label="Input prefix length" type="range" min="0" max={input.length} value={position} onChange={(event) => setPosition(Number(event.target.value))} /></label>
    <Automaton position={position} />
    <p className="text-sm">All prefixes reaching the same state are equivalent with respect to every continuation: appending the same suffix yields the same accept/reject result.</p>
  </InteractivePlayground>;
}
