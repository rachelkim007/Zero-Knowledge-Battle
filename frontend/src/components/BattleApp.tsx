import { useCallback, useEffect, useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';
import { isAddress, zeroAddress } from 'viem';

import { AttributeAllocator } from './AttributeAllocator';
import { Header } from './Header';
import { MonsterList, type Monster } from './MonsterList';
import { PlayerStats } from './PlayerStats';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import {
  CONFIDENTIAL_GOLD_ABI,
  CONFIDENTIAL_GOLD_ADDRESS,
  ZERO_KNOWLEDGE_BATTLE_ABI,
  ZERO_KNOWLEDGE_BATTLE_ADDRESS,
} from '../config/contracts';
import '../App.css';

type AttributeKey = 'attack' | 'defense' | 'health';

type AllocationState = Record<AttributeKey, number>;

type PlayerCipher = {
  registered: boolean;
  attack: string;
  defense: string;
  maxHealth: string;
  currentHealth: string;
  battles: string;
  victories: string;
};

const MAX_POINTS = 10;
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

export function BattleApp() {
  const { address } = useAccount();
  const signer = useEthersSigner();
  const publicClient = usePublicClient();
  const { instance, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();

  const [allocation, setAllocation] = useState<AllocationState>({ attack: 4, defense: 3, health: 3 });
  const [playerCipher, setPlayerCipher] = useState<PlayerCipher | null>(null);
  const [playerStats, setPlayerStats] = useState<{
    attack: bigint;
    defense: bigint;
    maxHealth: bigint;
    currentHealth: bigint;
    battles: bigint;
    victories: bigint;
  } | null>(null);
  const [tokenCipher, setTokenCipher] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [monstersLoading, setMonstersLoading] = useState(false);

  const [isRegistering, setIsRegistering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingMonster, setPendingMonster] = useState<number | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const totalPoints = allocation.attack + allocation.defense + allocation.health;
  const remainingPoints = Math.max(0, MAX_POINTS - totalPoints);

  const battleAddressValid = useMemo(() => {
    return isAddress(ZERO_KNOWLEDGE_BATTLE_ADDRESS) && ZERO_KNOWLEDGE_BATTLE_ADDRESS !== zeroAddress;
  }, []);

  const goldAddressValid = useMemo(() => {
    return isAddress(CONFIDENTIAL_GOLD_ADDRESS) && CONFIDENTIAL_GOLD_ADDRESS !== zeroAddress;
  }, []);

  const canInteract = battleAddressValid && goldAddressValid && !!publicClient;

  const handleAllocationChange = useCallback((attribute: AttributeKey, value: number) => {
    const cleanValue = Number.isFinite(value) ? Math.floor(Math.max(0, value)) : 0;
    setAllocation((previous) => {
      const previousTotal = previous.attack + previous.defense + previous.health;
      const otherTotal = previousTotal - previous[attribute];
      const maxForAttribute = Math.min(MAX_POINTS - otherTotal, 10);
      const nextValue = Math.min(cleanValue, Math.max(0, maxForAttribute));
      return { ...previous, [attribute]: nextValue };
    });
  }, []);

  const fetchMonsters = useCallback(async () => {
    if (!canInteract) {
      setMonsters([]);
      return;
    }

    setMonstersLoading(true);
    try {
      const count = Number(await publicClient!.readContract({
        address: ZERO_KNOWLEDGE_BATTLE_ADDRESS as `0x${string}`,
        abi: ZERO_KNOWLEDGE_BATTLE_ABI,
        functionName: 'monstersCount',
      }));

      const entries: Monster[] = [];
      for (let i = 0; i < count; i += 1) {
        const monster = await publicClient!.readContract({
          address: ZERO_KNOWLEDGE_BATTLE_ADDRESS as `0x${string}`,
          abi: ZERO_KNOWLEDGE_BATTLE_ABI,
          functionName: 'getMonster',
          args: [BigInt(i)],
        }) as any;

        entries.push({
          id: i,
          name: monster.name as string,
          attack: Number(monster.attack),
          defense: Number(monster.defense),
          health: Number(monster.health),
          reward: Number(monster.reward),
          active: Boolean(monster.active),
        });
      }

      setMonsters(entries);
    } catch (error) {
      console.error('Failed to load monsters', error);
      setMonsters([]);
    } finally {
      setMonstersLoading(false);
    }
  }, [canInteract, publicClient]);

  const fetchPlayerData = useCallback(async () => {
    if (!canInteract || !address) {
      setPlayerCipher(null);
      setTokenCipher(null);
      setTokenBalance(null);
      return;
    }

    try {
      const response = await publicClient!.readContract({
        address: ZERO_KNOWLEDGE_BATTLE_ADDRESS as `0x${string}`,
        abi: ZERO_KNOWLEDGE_BATTLE_ABI,
        functionName: 'getPlayer',
        args: [address],
      }) as [boolean, string, string, string, string, string, string];

      const [registered, attack, defense, maxHealth, currentHealth, battles, victories] = response;
      setPlayerCipher({ registered, attack, defense, maxHealth, currentHealth, battles, victories });

      const balanceHandle = await publicClient!.readContract({
        address: CONFIDENTIAL_GOLD_ADDRESS as `0x${string}`,
        abi: CONFIDENTIAL_GOLD_ABI,
        functionName: 'confidentialBalanceOf',
        args: [address],
      }) as string;

      setTokenCipher(balanceHandle);

      if (balanceHandle === ZERO_HASH) {
        setTokenBalance(0n);
      } else {
        setTokenBalance(null);
      }
    } catch (error) {
      console.error('Failed to read player data', error);
      setPlayerCipher(null);
      setTokenCipher(null);
      setTokenBalance(null);
    }
  }, [address, canInteract, publicClient]);

  useEffect(() => {
    fetchMonsters();
  }, [fetchMonsters]);

  useEffect(() => {
    fetchPlayerData();
  }, [fetchPlayerData]);

  const encryptAllocation = useCallback(async () => {
    if (!instance || !address) {
      throw new Error('Encryption service not ready');
    }

    const buffer = instance.createEncryptedInput(ZERO_KNOWLEDGE_BATTLE_ADDRESS, address);
    buffer.add16(BigInt(allocation.attack));
    buffer.add16(BigInt(allocation.defense));
    buffer.add16(BigInt(allocation.health));
    return buffer.encrypt();
  }, [instance, address, allocation]);

  const resolveSigner = useCallback(async () => {
    const resolved = await signer;
    if (!resolved) {
      throw new Error('Connect wallet to perform this action');
    }
    return resolved;
  }, [signer]);

  const handleRegister = useCallback(async () => {
    if (totalPoints !== MAX_POINTS) {
      setStatusMessage('Distribute all 10 points before registering.');
      return;
    }

    try {
      setIsRegistering(true);
      setStatusMessage('Encrypting allocation…');
      const encrypted = await encryptAllocation();
      const resolvedSigner = await resolveSigner();
      const contract = new Contract(
        ZERO_KNOWLEDGE_BATTLE_ADDRESS,
        ZERO_KNOWLEDGE_BATTLE_ABI,
        resolvedSigner,
      );

      const tx = await contract.registerPlayer(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.inputProof,
      );

      setStatusMessage('Registration submitted, awaiting confirmation…');
      await tx.wait();
      setStatusMessage('Player registered successfully.');
      setPlayerStats(null);
      await fetchPlayerData();
    } catch (error: any) {
      console.error('Registration failed', error);
      setStatusMessage(error?.message || 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  }, [encryptAllocation, fetchPlayerData, resolveSigner, totalPoints]);

  const handleUpdate = useCallback(async () => {
    if (!playerCipher?.registered) {
      setStatusMessage('Register before updating attributes.');
      return;
    }
    if (totalPoints !== MAX_POINTS) {
      setStatusMessage('Distribute all 10 points before updating.');
      return;
    }

    try {
      setIsUpdating(true);
      setStatusMessage('Encrypting allocation…');
      const encrypted = await encryptAllocation();
      const resolvedSigner = await resolveSigner();
      const contract = new Contract(
        ZERO_KNOWLEDGE_BATTLE_ADDRESS,
        ZERO_KNOWLEDGE_BATTLE_ABI,
        resolvedSigner,
      );

      const tx = await contract.updateAttributes(
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.inputProof,
      );

      setStatusMessage('Attribute reconfiguration submitted…');
      await tx.wait();
      setStatusMessage('Attributes updated successfully.');
      setPlayerStats(null);
      await fetchPlayerData();
    } catch (error: any) {
      console.error('Update failed', error);
      setStatusMessage(error?.message || 'Attribute update failed.');
    } finally {
      setIsUpdating(false);
    }
  }, [encryptAllocation, fetchPlayerData, playerCipher, resolveSigner, totalPoints]);

  const handleAttack = useCallback(async (monsterId: number) => {
    if (!playerCipher?.registered) {
      setStatusMessage('Register before attacking any monster.');
      return;
    }

    try {
      setPendingMonster(monsterId);
      setStatusMessage('Battle transaction submitted…');
      const resolvedSigner = await resolveSigner();
      const contract = new Contract(
        ZERO_KNOWLEDGE_BATTLE_ADDRESS,
        ZERO_KNOWLEDGE_BATTLE_ABI,
        resolvedSigner,
      );

      const tx = await contract.attackMonster(BigInt(monsterId));
      await tx.wait();
      setStatusMessage('Battle resolved. Refreshing encrypted state…');
      setPlayerStats(null);
      await fetchPlayerData();
    } catch (error: any) {
      console.error('Attack failed', error);
      setStatusMessage(error?.message || 'Attack failed.');
    } finally {
      setPendingMonster(null);
    }
  }, [fetchPlayerData, playerCipher, resolveSigner]);

  const handleRestore = useCallback(async () => {
    if (!playerCipher?.registered) {
      setStatusMessage('Register before restoring health.');
      return;
    }

    try {
      setIsRestoring(true);
      const resolvedSigner = await resolveSigner();
      const contract = new Contract(
        ZERO_KNOWLEDGE_BATTLE_ADDRESS,
        ZERO_KNOWLEDGE_BATTLE_ABI,
        resolvedSigner,
      );

      const tx = await contract.restoreHealth();
      await tx.wait();
      setStatusMessage('Health restored to encrypted maximum.');
      setPlayerStats(null);
      await fetchPlayerData();
    } catch (error: any) {
      console.error('Restore failed', error);
      setStatusMessage(error?.message || 'Restore failed.');
    } finally {
      setIsRestoring(false);
    }
  }, [fetchPlayerData, playerCipher, resolveSigner]);

  const handleDecrypt = useCallback(async () => {
    if (!instance || !address || !playerCipher?.registered) {
      return;
    }

    try {
      setDecrypting(true);
      const keypair = instance.generateKeypair();
      const startTime = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';

      const handleContractPairs = [
        { handle: playerCipher.attack, contractAddress: ZERO_KNOWLEDGE_BATTLE_ADDRESS },
        { handle: playerCipher.defense, contractAddress: ZERO_KNOWLEDGE_BATTLE_ADDRESS },
        { handle: playerCipher.maxHealth, contractAddress: ZERO_KNOWLEDGE_BATTLE_ADDRESS },
        { handle: playerCipher.currentHealth, contractAddress: ZERO_KNOWLEDGE_BATTLE_ADDRESS },
        { handle: playerCipher.battles, contractAddress: ZERO_KNOWLEDGE_BATTLE_ADDRESS },
        { handle: playerCipher.victories, contractAddress: ZERO_KNOWLEDGE_BATTLE_ADDRESS },
      ];

      const uniqueContracts = new Set<string>([ZERO_KNOWLEDGE_BATTLE_ADDRESS]);

      let includeBalance = false;
      if (tokenCipher && tokenCipher !== ZERO_HASH) {
        handleContractPairs.push({ handle: tokenCipher, contractAddress: CONFIDENTIAL_GOLD_ADDRESS });
        uniqueContracts.add(CONFIDENTIAL_GOLD_ADDRESS);
        includeBalance = true;
      }

      const contractAddresses = Array.from(uniqueContracts);

      const eip712 = instance.createEIP712(
        keypair.publicKey,
        contractAddresses,
        startTime,
        durationDays,
      );

      const resolvedSigner = await resolveSigner();

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTime,
        durationDays,
      );

      const numericValues = result.map((entry: any) => BigInt(entry.value ?? 0));

      setPlayerStats({
        attack: numericValues[0],
        defense: numericValues[1],
        maxHealth: numericValues[2],
        currentHealth: numericValues[3],
        battles: numericValues[4],
        victories: numericValues[5],
      });

      if (includeBalance) {
        setTokenBalance(numericValues[6]);
      }
    } catch (error) {
      console.error('Decryption failed', error);
      setStatusMessage('Decryption request failed.');
    } finally {
      setDecrypting(false);
    }
  }, [instance, address, playerCipher, tokenCipher, resolveSigner]);

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        {!battleAddressValid || !goldAddressValid ? (
          <div className="warning-banner">
            <p>Please set deployed contract addresses in <code>frontend/src/config/contracts.ts</code> before interacting.</p>
          </div>
        ) : null}

        {statusMessage ? (
          <div className="status-banner">{statusMessage}</div>
        ) : null}

        <div className="grid-two">
          <AttributeAllocator
            allocation={allocation}
            remaining={remainingPoints}
            onChange={handleAllocationChange}
          />

          <div className="section-card">
            <h2 className="section-title">On-chain actions</h2>
            <p className="section-description">
              Encrypt attributes locally, then submit transactions with ethers write calls.
            </p>

            <div className="action-stack">
              <button
                type="button"
                className="primary-action"
                disabled={!canInteract || isRegistering || isZamaLoading}
                onClick={handleRegister}
              >
                {isRegistering ? 'Registering…' : 'Register player'}
              </button>
              <button
                type="button"
                className="secondary-action"
                disabled={!canInteract || isUpdating || isZamaLoading}
                onClick={handleUpdate}
              >
                {isUpdating ? 'Updating…' : 'Update attributes'}
              </button>
              <button
                type="button"
                className="ghost-action"
                disabled={!canInteract || isRestoring}
                onClick={handleRestore}
              >
                {isRestoring ? 'Restoring…' : 'Restore health'}
              </button>
              {zamaError ? <p className="action-hint">{zamaError}</p> : null}
            </div>
          </div>
        </div>

        <PlayerStats
          cipher={playerCipher}
          decrypted={playerStats}
          tokenBalance={tokenBalance}
          onDecrypt={handleDecrypt}
          decrypting={decrypting}
          canDecrypt={!!instance && !!address && !isZamaLoading}
        />

        <section className="section-card">
          <div className="section-head">
            <h2 className="section-title">Monster roster</h2>
            <p className="section-description">
              Trigger confidential combat; rewards are minted as encrypted cGold on victory.
            </p>
          </div>
          <MonsterList
            monsters={monsters}
            onAttack={handleAttack}
            disabled={!canInteract}
            pendingId={pendingMonster}
            isLoading={monstersLoading}
          />
        </section>
      </main>
    </div>
  );
}
