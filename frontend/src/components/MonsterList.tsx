import { Fragment } from 'react';
import '../styles/MonsterList.css';

export type Monster = {
  id: number;
  name: string;
  attack: number;
  defense: number;
  health: number;
  reward: number;
  active: boolean;
};

type MonsterListProps = {
  monsters: Monster[];
  onAttack: (monsterId: number) => void;
  disabled: boolean;
  pendingId: number | null;
  isLoading: boolean;
};

export function MonsterList({ monsters, onAttack, disabled, pendingId, isLoading }: MonsterListProps) {
  if (isLoading) {
    return (
      <div className="monster-card">
        <p className="monster-loading">Loading monsters from the encrypted wilderness…</p>
      </div>
    );
  }

  if (!monsters.length) {
    return (
      <div className="monster-card">
        <p className="monster-loading">No monsters available. Check back after deployment.</p>
      </div>
    );
  }

  return (
    <div className="monster-grid">
      {monsters.map((monster) => (
        <div key={monster.id} className={`monster-card ${monster.active ? '' : 'monster-card--inactive'}`}>
          <div className="monster-header">
            <span className="monster-name">{monster.name}</span>
            <span className="monster-reward">Reward: {monster.reward} cGOLD</span>
          </div>

          <div className="monster-stats">
            <Stat label="Attack" value={monster.attack} />
            <Stat label="Defense" value={monster.defense} />
            <Stat label="Health" value={monster.health} />
          </div>

          <button
            type="button"
            className="monster-action"
            disabled={disabled || !monster.active || pendingId === monster.id}
            onClick={() => onAttack(monster.id)}
          >
            {pendingId === monster.id ? 'Resolving...' : monster.active ? 'Attack' : 'Inactive'}
          </button>
        </div>
      ))}
    </div>
  );
}

type StatProps = {
  label: string;
  value: number;
};

function Stat({ label, value }: StatProps) {
  return (
    <Fragment>
      <div className="monster-stat">
        <span className="monster-stat-label">{label}</span>
        <span className="monster-stat-value">{value}</span>
      </div>
    </Fragment>
  );
}
