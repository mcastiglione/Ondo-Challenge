const { contractAddresses } = require("../../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('TestFundingProvider', {
    from: deployer,
    log: true,
    args: [
      contractAddresses.sushiRouterAddress,
      contractAddresses.sushiPoolAddress,
      contractAddresses.tokeTokenAddress
    ]
  });

};

module.exports.tags = ['testfundingprovider'];