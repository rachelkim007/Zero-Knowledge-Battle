// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {FHE, ebool, euint16, euint32, euint64, externalEuint16} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ConfidentialGold} from "./ConfidentialGold.sol";

contract ZeroKnowledgeBattle is SepoliaConfig {
    struct PlayerData {
        bool registered;
        euint16 attack;
        euint16 defense;
        euint16 maxHealth;
        euint16 currentHealth;
        euint32 battles;
        euint32 victories;
    }

    struct Monster {
        string name;
        uint32 attack;
        uint32 defense;
        uint32 health;
        uint64 reward;
        bool active;
    }

    ConfidentialGold public immutable rewardToken;

    Monster[] private _monsters;
    mapping(address player => PlayerData) private _players;

    event PlayerRegistered(address indexed player);
    event AttributesUpdated(address indexed player);
    event MonsterAttacked(address indexed player, uint256 indexed monsterId);
    event PlayerRestored(address indexed player);

    error ZeroKnowledgeBattleAlreadyRegistered(address player);
    error ZeroKnowledgeBattleInvalidMonster(uint256 monsterId);
    error ZeroKnowledgeBattleInactiveMonster(uint256 monsterId);
    error ZeroKnowledgeBattleNotRegistered(address player);

    constructor(address rewardTokenAddress) SepoliaConfig() {
        rewardToken = ConfidentialGold(rewardTokenAddress);

        _monsters.push(Monster("Forest Imp", 2, 1, 5, 2, true));
        _monsters.push(Monster("Stone Golem", 4, 4, 8, 4, true));
        _monsters.push(Monster("Arcane Wraith", 5, 3, 10, 6, true));
    }

    function registerPlayer(
        externalEuint16 attack,
        externalEuint16 defense,
        externalEuint16 health,
        bytes calldata inputProof
    ) external {
        PlayerData storage player = _players[msg.sender];
        if (player.registered) {
            revert ZeroKnowledgeBattleAlreadyRegistered(msg.sender);
        }

        player.attack = _storeStat(FHE.fromExternal(attack, inputProof), msg.sender);
        player.defense = _storeStat(FHE.fromExternal(defense, inputProof), msg.sender);
        euint16 maxHealth = _storeStat(FHE.fromExternal(health, inputProof), msg.sender);
        player.maxHealth = maxHealth;
        player.currentHealth = maxHealth;

        player.battles = _storeCounter(FHE.asEuint32(0), msg.sender);
        player.victories = _storeCounter(FHE.asEuint32(0), msg.sender);
        player.registered = true;

        emit PlayerRegistered(msg.sender);
    }

    function updateAttributes(
        externalEuint16 attack,
        externalEuint16 defense,
        externalEuint16 health,
        bytes calldata inputProof
    ) external {
        PlayerData storage player = _players[msg.sender];
        if (!player.registered) {
            revert ZeroKnowledgeBattleNotRegistered(msg.sender);
        }

        player.attack = _storeStat(FHE.fromExternal(attack, inputProof), msg.sender);
        player.defense = _storeStat(FHE.fromExternal(defense, inputProof), msg.sender);
        euint16 maxHealth = _storeStat(FHE.fromExternal(health, inputProof), msg.sender);
        player.maxHealth = maxHealth;
        player.currentHealth = maxHealth;

        emit AttributesUpdated(msg.sender);
    }

    function attackMonster(uint256 monsterId) external {
        PlayerData storage player = _players[msg.sender];
        if (!player.registered) {
            revert ZeroKnowledgeBattleNotRegistered(msg.sender);
        }

        if (monsterId >= _monsters.length) {
            revert ZeroKnowledgeBattleInvalidMonster(monsterId);
        }

        Monster storage monster = _monsters[monsterId];
        if (!monster.active) {
            revert ZeroKnowledgeBattleInactiveMonster(monsterId);
        }

        player.battles = _storeCounter(_add(player.battles, FHE.asEuint32(1)), msg.sender);

        euint32 attackValue = FHE.asEuint32(player.attack);
        euint32 defenseValue = FHE.asEuint32(player.defense);
        euint32 healthValue = FHE.asEuint32(player.currentHealth);

        ebool strongEnough = FHE.ge(attackValue, FHE.asEuint32(monster.defense));
        ebool resilientEnough = FHE.ge(_add(defenseValue, healthValue), FHE.asEuint32(monster.attack));
        ebool victory = FHE.and(strongEnough, resilientEnough);

        player.victories = _storeCounter(
            _add(player.victories, FHE.select(victory, FHE.asEuint32(1), FHE.asEuint32(0))),
            msg.sender
        );

        euint32 survivableDamage = FHE.select(resilientEnough, FHE.asEuint32(monster.attack), healthValue);
        healthValue = FHE.select(
            victory,
            healthValue,
            FHE.sub(healthValue, _min(healthValue, survivableDamage))
        );
        healthValue = _min(healthValue, FHE.asEuint32(player.maxHealth));
        player.currentHealth = _storeStat(FHE.asEuint16(healthValue), msg.sender);

        euint64 rewardAmount = FHE.select(victory, FHE.asEuint64(monster.reward), FHE.asEuint64(0));
        FHE.allowThis(rewardAmount);
        FHE.allow(rewardAmount, address(rewardToken));
        rewardToken.mintBattleReward(msg.sender, rewardAmount);

        euint32 penalty = FHE.select(victory, FHE.asEuint32(0), FHE.asEuint32(monster.defense));
        defenseValue = FHE.select(
            FHE.gt(defenseValue, penalty),
            FHE.sub(defenseValue, penalty),
            FHE.asEuint32(0)
        );
        player.defense = _storeStat(FHE.asEuint16(defenseValue), msg.sender);

        emit MonsterAttacked(msg.sender, monsterId);
    }

    function restoreHealth() external {
        PlayerData storage player = _players[msg.sender];
        if (!player.registered) {
            revert ZeroKnowledgeBattleNotRegistered(msg.sender);
        }

        euint16 restored = player.maxHealth;
        FHE.allowThis(restored);
        FHE.allow(restored, msg.sender);
        player.currentHealth = restored;

        emit PlayerRestored(msg.sender);
    }

    function getPlayer(
        address account
    )
        external
        view
        returns (
            bool isRegistered,
            euint16 attack,
            euint16 defense,
            euint16 maxHealth,
            euint16 currentHealth,
            euint32 battles,
            euint32 victories
        )
    {
        PlayerData storage player = _players[account];
        return (
            player.registered,
            player.attack,
            player.defense,
            player.maxHealth,
            player.currentHealth,
            player.battles,
            player.victories
        );
    }

    function getMonster(uint256 monsterId) external view returns (Monster memory) {
        if (monsterId >= _monsters.length) {
            revert ZeroKnowledgeBattleInvalidMonster(monsterId);
        }
        return _monsters[monsterId];
    }

    function monstersCount() external view returns (uint256) {
        return _monsters.length;
    }

    function _storeStat(euint16 value, address account) private returns (euint16) {
        FHE.allowThis(value);
        FHE.allow(value, account);
        return value;
    }

    function _storeCounter(euint32 value, address account) private returns (euint32) {
        FHE.allowThis(value);
        FHE.allow(value, account);
        return value;
    }

    function _add(euint32 left, euint32 right) private returns (euint32) {
        return FHE.add(left, right);
    }

    function _min(euint32 left, euint32 right) private returns (euint32) {
        return FHE.select(FHE.lt(left, right), left, right);
    }
}
