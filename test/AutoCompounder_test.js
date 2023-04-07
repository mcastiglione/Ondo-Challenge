const { ethers } = require('hardhat');
const chai = require('chai');
chai.use(waffle.solidity);
const { expect, assert } = chai;
const { EIP712Domain, Recipient } = require('./helpers/eip712');
const ethSigUtil = require('eth-sig-util');
const { fromRpcSig } = require('ethereumjs-util');
const { contractAddresses } = require("../helper-hardhat-config");

const { privateKey } = require('../hardhat.config');

describe('AutoCompounder', function () {

  domainName = "TOKE Distribution";
  domainVersion = "1";

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    await deployments.fixture(['rewardsmock', 'poolmock', 'autocompounder', 'testfundingprovider']);
    autocompounder = await ethers.getContract('AutoCompounder');
    rewards = await ethers.getContract('RewardsMock');
    testfundingprovider = await ethers.getContract('TestFundingProvider');
    sushiPool = await ethers.getContractAt('IERC20', contractAddresses.sushiPoolAddress);
    
    tokeSushiLPPool = await ethers.getContract('PoolMock');

    manager = await ethers.getContract('ManagerMock');

    chainId = (await rewards.getChainId()).toString();
  });

  buildData = (
    name, 
    version, 
    chainId, 
    verifyingContract, 
    cycle, 
    wallet, 
    amount
  ) => ({
    primaryType: 'Recipient',
    types: { EIP712Domain, Recipient },
    domain: { name, version, chainId, verifyingContract },
    message: { chainId, cycle, wallet, amount },
  });

  it('should deploy AutoCompounder', async () => {
    assert.ok(autocompounder.address);
  });

  describe('Deposit', function () {

    it('can only be called by owner', async () => {
      const tx = autocompounder.connect(alice).deposit(1);

      await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Amount must be greater than 0', async () => {
      const tx = autocompounder.deposit(0);

      await expect(tx).to.be.revertedWith('Invalid amount');
    });

    it('Not enough allowance', async () => {
      const tx = autocompounder.deposit(1);

      await expect(tx).to.be.revertedWith('Not enough allowance');
    });

    it('Ok. Check values', async () => {

      const options = {value: ethers.utils.parseEther("100")}
      await testfundingprovider.getLiquidity(options);

      const balanceBefore = await sushiPool.balanceOf(tokeSushiLPPool.address);

      const amount = 1000;
      await sushiPool.approve(autocompounder.address, amount)
      await autocompounder.deposit(amount);

      const balanceAfter = await sushiPool.balanceOf(tokeSushiLPPool.address);

      await expect(balanceAfter).to.be.equal(balanceBefore.add(amount));

      
    });

  });


  describe('autocompound', function () {

    it('Invalid value for cycle', async () => {
      const tx = autocompounder.autocompound(
        0,
        1,
        0,
        '0x0000000000000000000000000000000000000000000000000000000000000000', 
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      );

      await expect(tx).to.be.revertedWith('Invalid cycle');
    });

    it('Invalid value for amount', async () => {
      const tx = autocompounder.autocompound(
        1, 
        0, 
        0, 
        '0x0000000000000000000000000000000000000000000000000000000000000000', 
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      );

      await expect(tx).to.be.revertedWith('Invalid amount');
    });


    it('Ok. check values', async () => {

      const balanceBefore = await tokeSushiLPPool.balanceOf(autocompounder.address);

      const options = {value: ethers.utils.parseEther("10")}
      await testfundingprovider.swapEthForToke(rewards.address, options);

      const privateKeyBuffer = Buffer.from(privateKey, 'hex');

      const cycle = 1;
      const amount = 1000000;

      const data = buildData(
          domainName,
          domainVersion, 
          chainId, 
          rewards.address, 
          cycle, 
          autocompounder.address, 
          amount
      );

      const signature = ethSigUtil.signTypedMessage(privateKeyBuffer, { data });
      const { v, r, s } = fromRpcSig(signature);

      await autocompounder.autocompound(
          cycle,
          amount,
          v,r,s
      );

      const balanceAfter = await tokeSushiLPPool.balanceOf(autocompounder.address);

      await expect(balanceAfter).to.be.above(balanceBefore);

    });

  });


  describe('withdraw', function () {

    describe('requestWithdrawal', function () {

      it('can only be called by owner', async () => {
        const tx = autocompounder.connect(alice).requestWithdrawal(1);
  
        await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('Invalid amount', async () => {
        const tx = autocompounder.requestWithdrawal(0);
  
        await expect(tx).to.be.revertedWith('Invalid amount');
      });

      it('Not enough balance', async () => {

        const tx = autocompounder.requestWithdrawal(1);
  
        await expect(tx).to.be.revertedWith('INSUFFICIENT_BALANCE');
      });

      it('Passes', async () => {

        const options = {value: ethers.utils.parseEther("100")}
        await testfundingprovider.getLiquidity(options);
    
        const amount = 1000;
        await sushiPool.approve(autocompounder.address, amount)
        await autocompounder.deposit(amount);
        await autocompounder.requestWithdrawal(amount);
  
      });

    });

    describe('executeWithdrawal', function () {

      it('can only be called by owner', async () => {
        const tx = autocompounder.connect(alice).executeWithdrawal(1);
  
        await expect(tx).to.be.revertedWith('Ownable: caller is not the owner');
      });

      it('Invalid amount', async () => {
        const tx = autocompounder.executeWithdrawal(0);
  
        await expect(tx).to.be.revertedWith('Invalid amount');
      });

      it('Insufficient balance', async () => {

        const tx = autocompounder.executeWithdrawal(1);
  
        await expect(tx).to.be.revertedWith('WITHDRAW_INSUFFICIENT_BALANCE');
      });

      it('Invalid cycle', async () => {

        const options = {value: ethers.utils.parseEther("100")}
        await testfundingprovider.getLiquidity(options);
    
        const amount = 1000;
        await sushiPool.approve(autocompounder.address, amount)
        await autocompounder.deposit(amount);
        await autocompounder.requestWithdrawal(amount);

        const tx = autocompounder.executeWithdrawal(amount);
  
        await expect(tx).to.be.revertedWith('INVALID_CYCLE');
      });


      it('Valid. Verify', async () => {

        const options = {value: ethers.utils.parseEther("100")}
        await testfundingprovider.getLiquidity(options);

        const amount = 1000;
        await sushiPool.approve(autocompounder.address, amount)
        await autocompounder.deposit(amount);
        await autocompounder.requestWithdrawal(amount);

        await manager.increaseCurrentCycle(1);
        const balanceBefore = await sushiPool.balanceOf(owner.address);
        
        await autocompounder.executeWithdrawal(amount);
        const balanceAfter = await sushiPool.balanceOf(owner.address);

        await expect(balanceAfter).to.be.equal(balanceBefore.add(amount));
  

      });

    });

  });

});
