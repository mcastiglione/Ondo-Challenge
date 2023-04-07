const { ethers } = require("hardhat");
const { contractAddresses } = require("../../helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const managermock = await ethers.getContract('ManagerMock');

  await deploy('PoolMock', {
    from: deployer,
    log: true,
    args: [],
    proxy: {
      proxyContract: 'UUPSProxy',
      execute: {
        init: {
          methodName: 'initialize',
          args: [
            contractAddresses.sushiPoolAddress,
            managermock.address,
            'Pool Mock',
            'PMCK'
          ],
        },
      },
    }
  });
};

module.exports.tags = ['poolmock'];
module.exports.dependencies = ['managermock'];
