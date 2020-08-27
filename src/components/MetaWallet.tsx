import BN = require("bn.js");
import * as React from "react";
import * as TruffleContract from "truffle-contract";
// import * as Web3 from "web3";
import Web3 = require('web3');
import { ContractsInfo, DAI_TOKEN } from '../util/constants';
import retry3Times from '../util/retry';

const config = {
  networkId: 42,
  explorer: "https://kovan.etherscan.io/",
};

const crossTokenError = console.error;

console.log(DAI_TOKEN);

const MainTokenContract = TruffleContract(
  require("../../build/contracts/MainToken.json"),
);
const BridgeContract = TruffleContract(
  require("../../build/contracts/Bridge_v1.json"),
);
// import IMainToken from "../contract-interfaces/IMainToken";

interface IMetaWalletProps {
  web3: Web3;
}

interface IMetaWalletState {
  account: string;
  accountError: boolean;
  balance: string;
  contractAddress: string;
}

export default class MetaWallet extends React.Component<
  IMetaWalletProps,
  IMetaWalletState
> {
  constructor(props) {
    super(props);
    this.state = {
      account: "",
      accountError: false,
      balance: "",
      contractAddress: "",
    };
  }

  public async componentWillMount() {
    const { web3 } = this.props;
    const accounts = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = accounts[0];

    if (!account) {
      this.setState({
        account: "",
        accountError: true,
      });
      return;
    }
    MainTokenContract.setProvider(web3.currentProvider);
    BridgeContract.setProvider(web3.currentProvider);
    // let tokenContract: IMainToken;
    let tokenContract;
    let bridgeContract;
    try {
      tokenContract = await MainTokenContract.at(ContractsInfo[42].testToken);
      bridgeContract = await BridgeContract.at(ContractsInfo[42].bridge);

      console.log("tokenContract: ", tokenContract);
      console.log("bridgeContract: ", bridgeContract);
    } catch (err) {
      alert(err);
      return;
    }

    // const balance  = await tokenContract.getBalance(web3.eth.accounts[0]);
    let balance;
    try {
      balance = await tokenContract.balanceOf(account);
      console.log("balance: ", balance);
    } catch (error) {
      console.log("error when get balance: ", error);
    }
    try {
      console.log("tokenContract.address: ", tokenContract.address);

      const withdraw = new BN(web3.fromWei(10 ** 18, "ether"));
      console.log("withdraw: ", withdraw.toString());
      const result = await tokenContract.approve(bridgeContract.address, withdraw.toString(), { from: account });
      // await tokenContract.send({from: account, gas:70000}, async (err, txHash) => {
      //   try {
      //       let receipt = await waitForReceipt(txHash);

      //   } catch(err) {
      //       console.log('Execution failed: ', err);
      //   }
      // });
      console.log("result: ", result);
    } catch (error) {
      console.log("error happened: ", error);
    }
    this.setState({
      // account: web3.eth.accounts[0],
      account,
      accountError: false,
      balance: balance.toString(),
      contractAddress: tokenContract.address,
    });
  }

  async crossToken() {
    // stepIcon('validate-balance','');
    // stepIcon('approve-transfer','');
    // stepIcon('transfer-tokens','');
    // stepIcon('wait-confirmations','');

    const { web3 } = this.props;
    const accounts = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
    const account = accounts[0];
    const address = account;
    MainTokenContract.setProvider(web3.currentProvider);
    const tokenContract = await MainTokenContract.at(ContractsInfo[42].testToken);
    const bridgeContract = await BridgeContract.at(ContractsInfo[42].bridge);

    const tokenAddress = tokenContract.address;
    console.log('tokenAddress: ', tokenAddress);
    // TODO
    const amount = new BN(10 ** 16);
    if (!amount) {
        crossTokenError("Complete the Amount field");
        return;
    }

    const decimals = tokenContract.decimals;
    const fee = 0;
    const totalCost = fee === 0 ? amount.shiftedBy(decimals) : amount.shiftedBy(decimals).dividedBy(1 - fee);
    const amountBN = totalCost.integerValue();

    let gasPrice = "";
    //let currentStep = 'validate-balance';
    return retry3Times(tokenContract.balanceOf(address).call)
    .then(async (balance) => {
      const balanceBN = new BN(balance);
      if (balanceBN.isLessThan(amountBN)) {
        throw new Error(`Insuficient Balance in your account, your current balance is ${balanceBN.shiftedBy(-decimals)} ${tokenContract.symbol}`);
      }
      const maxWithdrawInWei = await retry3Times(bridgeContract.calcMaxWithdraw().call);
      const maxWithdraw = new BN(web3.fromWei(maxWithdrawInWei, "ether"));
      if (amount.isGreaterThan(maxWithdraw)) {
        throw new Error(`Amount bigger than the daily limit. Daily limit left ${maxWithdraw} tokens`);
      }

      let gasPriceParsed = 0;
      if (config.networkId >= 30 && config.networkId <= 33) {
        const block: any = await web3.eth.getBlock("latest");
        gasPriceParsed = parseInt(block.minimumGasPrice);
        gasPriceParsed = gasPriceParsed <= 1 ? 1 : gasPriceParsed * 1.03;
      } else {
        const callback = (err, gasPriceAvg) => {
          if (!err) {
            gasPriceParsed = parseInt(gasPriceAvg);
            gasPriceParsed = gasPriceParsed <= 1 ? 1 : gasPriceParsed * 1.3;
          }
        }
        web3.eth.getGasPrice(callback);
      }
      gasPrice = `0x${Math.ceil(gasPriceParsed).toString(16)}`;
    }).then(async () => {
      // currentStep = 'approve-transfer';
      return new Promise((resolve, reject) => {
        tokenContract.approve(bridgeContract.options.address, amountBN.toString()).send({from: address, gasPrice, gas: 70000}, async (err, txHash) => {
          if (err) { return reject(err); }
          try {
            const receipt: any = await this.waitForReceipt(txHash);
            if (receipt.status) {
              resolve(receipt);
            }
          } catch (err) {
            reject(err);
          }
          reject(new Error(`Execution failed <a target="_blank" href="${config.explorer}/tx/${txHash}">see Tx</a>`));
        });
      });
    }).then(async () => {
      // currentStep = 'transfer-tokens';
      return new Promise((resolve, reject) => {
        bridgeContract.receiveTokens(tokenContract.options.address, amountBN.toString()).send({from: address, gasPrice, gas: 200000}, async (err, txHash) => {
          if (err) { return reject(err); }
          try {
            const receipt: any = await this.waitForReceipt(txHash);
            if (receipt.status) {
              resolve(receipt);
            }
          } catch (err) {
            reject(err);
          }
          reject(new Error(`Execution failed <a target="_blank" href="${config.explorer}/tx/${txHash}">see Tx</a>`));
        });
      });
    }).then(async (receipt) => {
      // currentStep = 'wait-confirmations';
      console.log("receipt: ", receipt);
    }).catch((err) => {
      //iconFail(currentStep);
      console.error(err);
      crossTokenError(`Couln't cross the tokens. ${err.message}`);
    });
  }

  async waitForReceipt(txHash) {
    const { web3 } = this.props;
    let timeElapsed = 0;
    const interval = 10000;
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(async () => {
            timeElapsed += interval;
            const receipt: any = await web3.eth.getTransactionReceipt(txHash);
            if(receipt != null) {
                clearInterval(checkInterval);
                resolve(receipt);
            }
            if(timeElapsed > 90000) {
                reject(new Error(`Operation took too long <a target="_blank" href="${config.explorer}/tx/${txHash}">check Tx on the explorer</a>`));
            }
        }, interval);
    });
  }


  public render() {
    return (
      <div>
        <h3>MainToken</h3>
        <p>Contract address: {this.state.contractAddress}</p>
        <p>
          Account:{" "}
          {this.state.accountError ? "No accounts found" : this.state.account}
        </p>
        <p>balance: {this.state.balance}</p>
      </div>
    );
  }
}
