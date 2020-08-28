export const DAI_TOKEN = {
  token: "DAI",
  name: "Dai Stablecoin",
  icon:
    "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png",
  30: {
    symbol: "rDAI",
    address: "0x6b1a73d547f4009a26b8485b63d7015d248ad406",
    decimals: 18,
  },
  31: {
    symbol: "rKovDAI",
    address: "0x0d86fca9be034a363cf12c9834af08d54a10451c",
    decimals: 18,
  },
  1: {
    symbol: "DAI",
    address: "0x6b175474e89094c44da98b954eedeac495271d0f",
    decimals: 18,
  },
  42: {
    symbol: "DAI",
    address: "0xc7cc3413f169a027dccfeffe5208ca4f38ef0c40",
    decimals: 18,
  },
};

export const ContractsInfo = {
  old42: {
    bridge: "0x2f1F4609180ceDb2cEB63c80cE6eCF94F4C0c394",
    federation: "0x41c16473b12211892C813F52815F700440471AA0",
    testToken: "0x41c16473b12211892c813f52815f700440471aa0",
    allowTokens: "0x5D1fE6BD8C57bEA32903079759e89900A462Ddc2",
  },
  42: {
    // testToken: "0x92e1b359bec60b966ce93295ed36fee10723990b",
    testToken: "0x41c16473b12211892c813f52815f700440471aa0",
    bridge: "0xf93d1b911c8f1f8ef445f0ec044cdb71bae36fba",
    federation: "0xe97dcd3d80778985447c09ff6be23fe2d2b3486a",
    multiSig: "0xc2087daf3f41afc1279f64b34ab0a091db32d40c",
    allowTokens: "0xecbda9e249ac6ce3cacdff87d5b07b938f5b8c79",
    host: "https://kovan.infura.io/v3/945c07d86744491cb15c4547227b2dfa",
    fromBlock: 20536111,
  },
};
