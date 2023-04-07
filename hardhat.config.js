require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-waffle');
require('solidity-coverage');
require('hardhat-deploy');
require('@nomiclabs/hardhat-etherscan');

require('dotenv').config();

const MNEMONIC = process.env.MNEMONIC;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_API_KEY = process.env.INFURA_API_KEY;

module.exports = {
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      },
      accounts: {
        // privateKey: PRIVATE_KEY,
        mnemonic: MNEMONIC,
        balance: '100000000000000000000',
      },
    },
    localhost: {
      url: 'http://127.0.0.1:8545', // ganache local network
      tags: ['local'],
    },
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      accounts: { mnemonic: MNEMONIC },
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: { mnemonic: MNEMONIC },
    },
  },
  namedAccounts: {
    deployer: 0,
    other: 1,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.4'
      }
    ],
  },
  privateKey: PRIVATE_KEY
};
