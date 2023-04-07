const { ethers } = require('hardhat');
const chai = require('chai');
chai.use(waffle.solidity);
const { expect, assert } = chai;
const { contractAddresses } = require("../helper-hardhat-config");

describe('TestFundingProvider', function () {

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    await deployments.fixture(['testfundingprovider']);
    testfundingprovider = await ethers.getContract('TestFundingProvider');
    tokeToken = await ethers.getContractAt('IERC20', contractAddresses.tokeTokenAddress);
    sushiPool = await ethers.getContractAt('IERC20', contractAddresses.sushiPoolAddress);
  });

  it('should deploy TestFundingProvider', async () => {
    assert.ok(testfundingprovider.address);
  });

  describe('getLiquidity', function () {

    it('Should provide LPs', async () => {

        const balanceBefore = await sushiPool.balanceOf(owner.address);
        const options = {value: ethers.utils.parseEther("0.1")}
        await testfundingprovider.getLiquidity(options);
        const balanceAfter = await sushiPool.balanceOf(owner.address);

        await expect(balanceAfter).to.be.above(balanceBefore);

    });

  });

  describe('swapEthForToke', function () {

    it('Should provide Toke tokens', async () => {

        const balanceBefore = await tokeToken.balanceOf(owner.address);
        const options = {value: ethers.utils.parseEther("1")}
        await testfundingprovider.swapEthForToke(owner.address, options);
        const balanceAfter = await tokeToken.balanceOf(owner.address);

        await expect(balanceAfter).to.be.above(balanceBefore);

    });

  });

});
