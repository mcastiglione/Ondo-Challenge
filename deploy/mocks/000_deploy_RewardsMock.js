const { contractAddresses } = require("../../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('RewardsMock', {
    from: deployer,
    log: true,
    args: [
      contractAddresses.tokeTokenAddress,
      deployer
    ]
  });

};

module.exports.tags = ['rewardsmock'];