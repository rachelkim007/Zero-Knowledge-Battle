import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("battle:addresses", "Print battle and token contract addresses").setAction(async function (_args: TaskArguments, hre) {
  const { deployments } = hre;

  const tokenDeployment = await deployments.get("ConfidentialGold");
  const battleDeployment = await deployments.get("ZeroKnowledgeBattle");

  console.log(`ConfidentialGold address: ${tokenDeployment.address}`);
  console.log(`ZeroKnowledgeBattle address: ${battleDeployment.address}`);
});

task("battle:monsters", "List configured monsters")
  .addOptionalParam("address", "ZeroKnowledgeBattle contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZeroKnowledgeBattle");

    const battleContract = await ethers.getContractAt("ZeroKnowledgeBattle", deployment.address);
    const monstersCount = Number(await battleContract.monstersCount());

    console.log(`Monster roster (${monstersCount} total)`);
    for (let i = 0; i < monstersCount; i++) {
      const monster = await battleContract.getMonster(i);
      console.log(
        `#${i} ${monster.name} | attack=${monster.attack} defense=${monster.defense} health=${monster.health} reward=${monster.reward} active=${monster.active}`,
      );
    }
  });

task("battle:player", "Decrypt and display a player's stats")
  .addParam("player", "Player address to inspect")
  .addOptionalParam("address", "ZeroKnowledgeBattle contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZeroKnowledgeBattle");

    const battleContract = await ethers.getContractAt("ZeroKnowledgeBattle", deployment.address);
    const [signer] = await ethers.getSigners();

    const playerData = await battleContract.getPlayer(taskArguments.player);

    if (!playerData[0]) {
      console.log(`Player ${taskArguments.player} is not registered.`);
      return;
    }

    const attack = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[1],
      deployment.address,
      signer,
    );
    const defense = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[2],
      deployment.address,
      signer,
    );
    const maxHealth = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[3],
      deployment.address,
      signer,
    );
    const currentHealth = await fhevm.userDecryptEuint(
      FhevmType.euint16,
      playerData[4],
      deployment.address,
      signer,
    );
    const battles = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerData[5],
      deployment.address,
      signer,
    );
    const victories = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      playerData[6],
      deployment.address,
      signer,
    );

    console.log(`Player ${taskArguments.player}`);
    console.log(`  attack        : ${attack}`);
    console.log(`  defense       : ${defense}`);
    console.log(`  max health    : ${maxHealth}`);
    console.log(`  current health: ${currentHealth}`);
    console.log(`  battles       : ${battles}`);
    console.log(`  victories     : ${victories}`);
  });
