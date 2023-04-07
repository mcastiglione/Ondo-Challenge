module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('ManagerMock', {
    from: deployer,
    log: true,
    args: []
  });

};

module.exports.tags = ['managermock'];