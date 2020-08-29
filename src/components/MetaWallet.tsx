// import BN = require("bn.js");
import * as React from "react";
import * as TruffleContract from "truffle-contract";
// import * as Web3 from "web3";
import Web3 = require('web3');
// import BigNumber from "bignumber.js"
const BigNumber = require('bignumber.js');
const styles = require("./style.css");
const plane = require("../plane.png");
import { ContractsInfo, DAI_TOKEN } from '../util/constants';
// import retry3Times from '../util/retry';
const DaiUdtTypeHash = '0x7abd58773ffee5866ffd30cd287e88f8139dd0cad5deb9e189c68b4b26bf9899';

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
  tokenContractAddress: string;
  bridgeContractAddress: string;
  balance: number;
  dai: number;
  ckbDaiToTransfer: number;
  ckbDai: number;
  isInputingCKB: boolean;
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
      tokenContractAddress: "",
      bridgeContractAddress: "",
      balance: 0,
      dai: 0,
      ckbDai: 0,
      ckbDaiToTransfer: 0,
      isInputingCKB: false,
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
    let ckbDai;
    try {
      balance = await tokenContract.balanceOf(account);
      ckbDai = await this.getCkbDai();
      console.log("balance: ", balance);
    } catch (error) {
      console.log("error when get balance: ", error);
    }

    this.setState({
      // account: web3.eth.accounts[0],
      account,
      accountError: false,
      balance: balance / 10 ** 18,
      ckbDai,
      tokenContractAddress: tokenContract.address,
      bridgeContractAddress: bridgeContract.address,
    });
  }

  public getCkbDai = async () => {
    const { data } = await (window as any).ckb.getUDTs();
    console.log('udtsObj: ', data);
    const result = (data[DaiUdtTypeHash].udt) / 10 ** 8;
    return result;
  }

  public crossTokenToCkb = async () => {
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
    console.log("tokenAddress: ", tokenAddress);
    const { dai } = this.state;
    if (!dai) {
        crossTokenError("Complete the Amount field");
        return;
    }
    // TODO
    const amount = new BigNumber(dai);

    const decimals = await tokenContract.decimals();
    console.log("decimals: ", decimals);
    const fee = 0;
    const totalCost = fee === 0 ? amount.shift(decimals) : amount.shift(decimals).dividedBy(1 - fee);
    // const amountBN = totalCost.integerValue();
    const amountBN = totalCost;

    let gasPrice = "";
    // let currentStep = 'validate-balance';
    const balance = await tokenContract.balanceOf(address);
    const balanceBN = new BigNumber(balance);
    if (balanceBN.lessThan(amountBN)) {
      throw new Error(`Insuficient Balance in your account,
      your current balance is ${balanceBN.shift(-decimals)} ${tokenContract.symbol}`);
    }
    const maxWithdrawInWei = await bridgeContract.calcMaxWithdraw();
    console.log("maxWithdrawInWei: ", maxWithdrawInWei);
    const maxWithdraw = new BigNumber(web3.fromWei(maxWithdrawInWei, "ether"));
    if (amount.greaterThan(maxWithdraw)) {
      throw new Error(`Amount bigger than the daily limit. Daily limit left ${maxWithdraw} tokens`);
    }

    let gasPriceParsed = 0;
    if (config.networkId >= 30 && config.networkId <= 33) {
      const block: any = await web3.eth.getBlock("latest");
      gasPriceParsed = parseInt(block.minimumGasPrice, 10);
      gasPriceParsed = gasPriceParsed <= 1 ? 1 : gasPriceParsed * 1.03;
    } else {
      const callback = (err, gasPriceAvg) => {
        if (!err) {
          gasPriceParsed = parseInt(gasPriceAvg, 10);
          gasPriceParsed = gasPriceParsed <= 1 ? 1 : gasPriceParsed * 1.3;
        }
      }
      web3.eth.getGasPrice(callback);
    }
    gasPrice = `0x${Math.ceil(gasPriceParsed).toString(16)}`;

    try {
      // currentStep = 'approve-transfer';
      const { logs, receipt, tx } = await tokenContract.approve(
        bridgeContract.address, amountBN.toString(), { from: address, gasPrice, gas: 70000 }
      );
      console.log("approve txHash: ", tx);
      console.log("approve logs: ", logs);
      // const txHash = await tokenContract.send({from: address, gasPrice, gas: 70000});
      if (receipt.status) {
        console.log("approve receipt: ", receipt);
      }
    } catch (error) {
      console.error(error);
    }

    try {
      // currentStep = "transfer-tokens";
      const { logs, receipt, tx } = await bridgeContract.receiveTokens(
        tokenContract.address, amountBN.toString(), { from: address, gasPrice, gas: 200000 }
      );
      console.log("receiveTokens txHash: ", tx);
      console.log("receiveTokens logs: ", logs);
      // await bridgeContract.send({from: address, gasPrice, gas: 200000});
      if (receipt.status) {
        console.log("receiveTokens receipt: ", receipt);
      }
    } catch (error) {
      console.error(error);
    }
  }

  public async waitForReceipt(txHash) {
    const { web3 } = this.props;
    let timeElapsed = 0;
    const interval = 10000;
    return new Promise((resolve, reject) => {
      const cb = (err, receipt) => {
        if (err) {
          console.error("waitForReceipt error: ", err);
          return;
        }
        if (receipt != null) {
            clearInterval(checkInterval);
            resolve(receipt);
        }
        if (timeElapsed > 90000) {
            reject(new Error(`Operation took too long
            <a target="_blank" href="${config.explorer}/tx/${txHash}">check Tx on the explorer</a>`));
        }
      };
      const checkInterval = setInterval(async () => {
          timeElapsed += interval;
          web3.eth.getTransactionReceipt(txHash, cb);
      }, interval);
    });
  }

  public crossTokenToEth = () => {
    (window as any).ckb.burnUDT(this.state.ckbDaiToTransfer);
  }

  public onEthDaiChange = (event) => {
    const dai = parseInt(event.target.value, 10);
    console.log("dai to transfer: ", dai, typeof dai);
    this.setState({ dai, isInputingCKB: false });
  }

  public onCkbDaiChange = (event) => {
    const ckbDaiToTransfer = parseInt(event.target.value, 10);
    console.log("ckbDaiToTransfer: ", ckbDaiToTransfer, typeof ckbDaiToTransfer);
    this.setState({ ckbDaiToTransfer, isInputingCKB: true });
  }

  public render() {
    const planeClass = this.state.isInputingCKB ? styles.planeContainerReversed : styles.planeContainer;
    return (
      <div className={styles.container}>
        <div className={styles.grid}>
          <h3>ETH DAI</h3>
          <div className={styles.balance}>{this.state.balance}</div>
          <div><input className={styles.input} onChange={this.onEthDaiChange} type="number" /></div>
          <div><button className={styles.btn} onClick={this.crossTokenToCkb}>Start to Cross</button></div>
        </div>
        <div className={planeClass}>
          <img src={plane} className={styles.plane} alt="transfer arrow" />
        </div>
        <div className={styles.grid}>
          <h3>CKB DAI</h3>
          <div className={styles.balance}>{this.state.ckbDai}</div>
          <div><input className={styles.input} onChange={this.onCkbDaiChange} type="number" /></div>
          <div><button className={styles.btn} onClick={this.crossTokenToEth}>Start to Cross</button></div>
        </div>
      </div>
    );
  }
}
