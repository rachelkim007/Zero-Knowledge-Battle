import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const goldDeployment = await deploy("ConfidentialGold", {
    from: deployer,
    log: true,
  });

  const battleDeployment = await deploy("ZeroKnowledgeBattle", {
    from: deployer,
    log: true,
    args: [goldDeployment.address],
  });

  const existingBattleContract = await hre.deployments.read("ConfidentialGold", "battleContract");

  if (existingBattleContract !== battleDeployment.address) {
    await hre.deployments.execute(
      "ConfidentialGold",
      {
        from: deployer,
        log: true,
      },
      "setBattleContract",
      battleDeployment.address,
    );
  }

  console.log("ConfidentialGold contract:", goldDeployment.address);
  console.log("ZeroKnowledgeBattle contract:", battleDeployment.address);
};
export default func;
func.id = "deploy_zero_knowledge_battle";
func.tags = ["ZeroKnowledgeBattle"];
