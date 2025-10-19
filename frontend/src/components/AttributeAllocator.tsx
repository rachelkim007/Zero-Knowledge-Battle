import '../styles/Allocator.css';

type AttributeKey = 'attack' | 'defense' | 'health';

const LABELS: Record<AttributeKey, string> = {
  attack: 'Attack',
  defense: 'Defense',
  health: 'Health',
};

type AttributeAllocatorProps = {
  allocation: Record<AttributeKey, number>;
  remaining: number;
  onChange: (attribute: AttributeKey, value: number) => void;
};

export function AttributeAllocator({ allocation, remaining, onChange }: AttributeAllocatorProps) {
  return (
    <div className="allocator-card">
      <div className="allocator-header">
        <div>
          <h2 className="allocator-title">Allocate your hero stats</h2>
          <p className="allocator-subtitle">Distribute 10 points across attack, defense, and health.</p>
        </div>
        <span className="allocator-remaining">{remaining} points remaining</span>
      </div>

      <div className="allocator-grid">
        {(Object.keys(LABELS) as AttributeKey[]).map((key) => (
          <div key={key} className="allocator-row">
            <div className="allocator-row-label">
              <span className="allocator-label">{LABELS[key]}</span>
            </div>
            <div className="allocator-controls">
              <button
                type="button"
                className="allocator-button"
                onClick={() => onChange(key, allocation[key] - 1)}
                disabled={allocation[key] === 0}
              >
                −
              </button>
              <input
                type="number"
                className="allocator-input"
                min={0}
                max={10}
                value={allocation[key]}
                onChange={(event) => onChange(key, Number(event.target.value))}
              />
              <button
                type="button"
                className="allocator-button"
                onClick={() => onChange(key, allocation[key] + 1)}
                disabled={remaining === 0}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
