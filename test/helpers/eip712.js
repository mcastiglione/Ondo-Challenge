const ethSigUtil = require('eth-sig-util');

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const Recipient = [
  { name: 'chainId', type: 'uint256' },
  { name: 'cycle', type: 'uint256' },
  { name: 'wallet', type: 'address' },
  { name: 'amount', type: 'uint256' },
];

async function domainSeparator (name, version, chainId, verifyingContract) {
  return '0x' + ethSigUtil.TypedDataUtils.hashStruct(
    'EIP712Domain',
    { name, version, chainId, verifyingContract },
    { EIP712Domain },
  ).toString('hex');
}

module.exports = {
  EIP712Domain,
  Recipient,
  domainSeparator,
};
