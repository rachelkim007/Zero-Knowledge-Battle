import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { ConfidentialGold, ZeroKnowledgeBattle } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

async function encryptAttributes(
  contractAddress: string,
  owner: HardhatEthersSigner,
  attack: number,
  defense: number,
  health: number,
) {
  const encryptedInput = await fhevm
    .createEncryptedInput(contractAddress, owner.address)
    .add16(attack)
    .add16(defense)
    .add16(health)
    .encrypt();

  return {
    handles: encryptedInput.handles,
    proof: encryptedInput.inputProof,
  };
}

describe("ZeroKnowledgeBattle", function () {
  let deployer: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;
  let rewardToken: ConfidentialGold;
  let battle: ZeroKnowledgeBattle;
  let battleAddress: string;
  let tokenAddress: string;

  before(async function () {
    [deployer, alice, bob] = await ethers.getSigners();
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      this.skip();
    }

    const tokenFactory = await ethers.getContractFactory("ConfidentialGold");
    rewardToken = (await tokenFactory.deploy()) as ConfidentialGold;
    tokenAddress = await rewardToken.getAddress();

    const battleFactory = await ethers.getContractFactory("ZeroKnowledgeBattle");
    battle = (await battleFactory.deploy(tokenAddress)) as ZeroKnowledgeBattle;
    battleAddress = await battle.getAddress();

    await rewardToken.setBattleContract(battleAddress);
  });

  async function decryptPlayerStats(player: HardhatEthersSigner) {
    const playerData = await battle.getPlayer(player.address);

    const attack = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[1],
      battleAddress,
      player,
    );
    const defense = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[2],
      battleAddress,
      player,
    );
    const maxHealth = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[3],
      battleAddress,
      player,
    );
    const currentHealth = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[4],
      battleAddress,
      player,
    );
    const battles = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerData[5],
      battleAddress,
      player,
    );
    const victories = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerData[6],
      battleAddress,
      player,
    );

    return { attack, defense, maxHealth, currentHealth, battles, victories };
  }

  async function decryptBalance(account: HardhatEthersSigner) {
    const encryptedBalance = await rewardToken.confidentialBalanceOf(account.address);
    if (encryptedBalance === ethers.ZeroHash) {
      return 0n;
    }
    return await fhevm.userDecryptEuint(FhevmType.euint64, encryptedBalance, tokenAddress, account);
  }

  it("registers a player with encrypted attributes", async function () {
    const { handles, proof } = await encryptAttributes(battleAddress, alice, 5, 3, 2);

    await battle.connect(alice).registerPlayer(handles[0], handles[1], handles[2], proof);

    const stats = await decryptPlayerStats(alice);
    expect(stats.attack).to.equal(5n);
    expect(stats.defense).to.equal(3n);
    expect(stats.maxHealth).to.equal(2n);
    expect(stats.currentHealth).to.equal(2n);
    expect(stats.battles).to.equal(0n);
    expect(stats.victories).to.equal(0n);
  });

  it("rewards victories with confidential gold", async function () {
    const { handles, proof } = await encryptAttributes(battleAddress, alice, 6, 3, 1);
    await battle.connect(alice).registerPlayer(handles[0], handles[1], handles[2], proof);

    await battle.connect(alice).attackMonster(0);

    const stats = await decryptPlayerStats(alice);
    expect(stats.battles).to.equal(1n);
    expect(stats.victories).to.equal(1n);
    expect(stats.currentHealth).to.equal(1n);

    const balance = await decryptBalance(alice);
    expect(balance).to.equal(2n);
  });

  it("tracks defeats without issuing rewards", async function () {
    const { handles, proof } = await encryptAttributes(battleAddress, bob, 0, 1, 1);
    await battle.connect(bob).registerPlayer(handles[0], handles[1], handles[2], proof);

    await battle.connect(bob).attackMonster(1);

    const stats = await decryptPlayerStats(bob);
    expect(stats.battles).to.equal(1n);
    expect(stats.victories).to.equal(0n);
    expect(stats.currentHealth).to.equal(0n);

    const balance = await decryptBalance(bob);
    expect(balance).to.equal(0n);
  });

  it("restores health to the encrypted maximum", async function () {
    const { handles, proof } = await encryptAttributes(battleAddress, alice, 1, 1, 5);
    await battle.connect(alice).registerPlayer(handles[0], handles[1], handles[2], proof);

    await battle.connect(alice).attackMonster(2);

    const statsAfterBattle = await decryptPlayerStats(alice);
    expect(statsAfterBattle.currentHealth).to.equal(0n);

    await battle.connect(alice).restoreHealth();

    const statsAfterRestore = await decryptPlayerStats(alice);
    expect(statsAfterRestore.currentHealth).to.equal(5n);
    expect(statsAfterRestore.maxHealth).to.equal(5n);
  });
});
