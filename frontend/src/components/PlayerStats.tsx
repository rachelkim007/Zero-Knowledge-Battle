import '../styles/PlayerStats.css';

type PlayerCipher = {
  registered: boolean;
};

type PlayerStatsProps = {
  cipher: PlayerCipher | null;
  decrypted: {
    attack: bigint;
    defense: bigint;
    maxHealth: bigint;
    currentHealth: bigint;
    battles: bigint;
    victories: bigint;
  } | null;
  tokenBalance: bigint | null;
  onDecrypt: () => Promise<void>;
  decrypting: boolean;
  canDecrypt: boolean;
};

export function PlayerStats({ cipher, decrypted, tokenBalance, onDecrypt, decrypting, canDecrypt }: PlayerStatsProps) {
  const isRegistered = cipher?.registered ?? false;

  return (
    <div className="player-card">
      <div className="player-header">
        <div>
          <h2 className="player-title">Player telemetry</h2>
          <p className="player-subtitle">
            All values remain encrypted on-chain; decrypt locally to inspect current progress.
          </p>
        </div>
        <span className={`player-status ${isRegistered ? 'player-status--ready' : 'player-status--pending'}`}>
          {isRegistered ? 'Registered adventurer' : 'Registration required'}
        </span>
      </div>

      <div className="player-grid">
        <PlayerMetric label="Attack" value={decrypted ? decrypted.attack.toString() : 'Encrypted'} />
        <PlayerMetric label="Defense" value={decrypted ? decrypted.defense.toString() : 'Encrypted'} />
        <PlayerMetric label="Max Health" value={decrypted ? decrypted.maxHealth.toString() : 'Encrypted'} />
        <PlayerMetric label="Current Health" value={decrypted ? decrypted.currentHealth.toString() : 'Encrypted'} />
        <PlayerMetric label="Battles" value={decrypted ? decrypted.battles.toString() : 'Encrypted'} />
        <PlayerMetric label="Victories" value={decrypted ? decrypted.victories.toString() : 'Encrypted'} />
        <PlayerMetric
          label="cGold balance"
          value={tokenBalance !== null ? tokenBalance.toString() : decrypted ? '0' : 'Encrypted'}
        />
      </div>

      <div className="player-actions">
        <button
          type="button"
          className="player-decrypt"
          disabled={!canDecrypt || decrypting || !isRegistered}
          onClick={onDecrypt}
        >
          {decrypting ? 'Decrypting...' : 'Decrypt my stats'}
        </button>
        {!canDecrypt ? (<p className="player-hint">Connect wallet and wait for Zama relayer to initialise.</p>) : null}
      </div>
    </div>
  );
}

type PlayerMetricProps = {
  label: string;
  value: string;
};

function PlayerMetric({ label, value }: PlayerMetricProps) {
  const isEncrypted = value === 'Encrypted';
  return (
    <div className={`player-metric ${isEncrypted ? 'player-metric--blurred' : ''}`}>
      <span className="player-metric-label">{label}</span>
      <span className="player-metric-value">{value}</span>
    </div>
  );
}
