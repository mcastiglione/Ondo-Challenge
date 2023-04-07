const { ethers } = require('hardhat');
const chai = require('chai');
chai.use(waffle.solidity);
const { expect, assert } = chai;
const { EIP712Domain, Recipient, domainSeparator } = require('./helpers/eip712');
const Wallet = require('ethereumjs-wallet').default;
const ethSigUtil = require('eth-sig-util');
const { fromRpcSig } = require('ethereumjs-util');
const { privateKey } = require('../hardhat.config');
const { contractAddresses } = require("../helper-hardhat-config");

describe('RewardsMock', function () {

  beforeEach(async function () {
    [owner, spender, alice, bob] = await ethers.getSigners();
    await deployments.fixture(['rewardsmock', 'testfundingprovider']);
    tokeToken = await ethers.getContractAt('IERC20', contractAddresses.tokeTokenAddress);
    rewards = await ethers.getContract('RewardsMock');
    chainId = (await rewards.getChainId()).toString();
    testfundingprovider = await ethers.getContract('TestFundingProvider');

    domainName = "TOKE Distribution";
    domainVersion = "1";
  
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

  it('should deploy RewardsMock', async () => {
    assert.ok(rewards.address);
  });

    it('domain separator', async function () {
    const domain_separator_sol = await rewards.DOMAIN_SEPARATOR();
    const domain_separator_js = await domainSeparator(domainName, domainVersion, chainId, rewards.address);

    expect(domain_separator_sol).to.be.equal(domain_separator_js);
    });

    describe('claim', function () {  
        it('not accept random signature', async function () {

            const cycle = 1;
            const amount = 1000;

            const randomWallet = Wallet.generate();

            const randomPrivateKey = randomWallet.getPrivateKey();
            const data = buildData(
                domainName,
                domainVersion, 
                chainId, 
                rewards.address, 
                cycle, 
                spender.address, 
                amount
            );

            const signature = ethSigUtil.signTypedMessage(randomPrivateKey, { data });

            const { v, r, s } = fromRpcSig(signature);

            const recipientData = {
                chainId: chainId, 
                cycle: cycle, 
                wallet: spender.address,
                amount: amount
            }

            const tx = rewards.claim(
                recipientData, 
                v,r,s
            );

            await expect(tx).to.be.revertedWith('Invalid Signature');

        });

        it('accept owner signature', async function () {
            const options = {value: ethers.utils.parseEther("10")}
            await testfundingprovider.swapEthForToke(rewards.address, options);

            const privateKeyBuffer = Buffer.from(privateKey, 'hex');

            const cycle = 1;
            const amount = 1000;

            const data = buildData(
                domainName,
                domainVersion, 
                chainId, 
                rewards.address, 
                cycle, 
                owner.address, 
                amount
            );

            const signature = ethSigUtil.signTypedMessage(privateKeyBuffer, { data });

            const { v, r, s } = fromRpcSig(signature);

            const recipientData = {
              chainId: chainId, 
              cycle: cycle, 
              wallet: owner.address,
              amount: amount
            }

            const balanceBefore = await tokeToken.balanceOf(owner.address);

            await rewards.claim(
                recipientData,
                v, r, s
            );

            const balanceAfter = await tokeToken.balanceOf(owner.address);

            await expect(balanceAfter).to.be.equal(balanceBefore.add(amount));

        });
  });

});
