const { ethers } = require("hardhat");
const { contractAddresses } = require("../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const rewards = await ethers.getContract('RewardsMock');
  const pool = await ethers.getContract('PoolMock');

  await deploy('AutoCompounder', {
    from: deployer,
    log: true,
    args: [
      contractAddresses.tokeTokenAddress,
      contractAddresses.sushiRouterAddress,
      contractAddresses.sushiPoolAddress, 
      pool.address,
      rewards.address
    ],
  });

};

module.exports.tags = ['autocompounder'];
module.exports.dependencies = ['rewardsmock', 'poolmock'];