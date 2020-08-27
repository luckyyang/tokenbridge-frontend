import * as React from "react";
import * as TruffleContract from "truffle-contract";
// import * as Web3 from "web3";
import Web3 = require('web3');
import BN = require("bn.js");
import { DAI_TOKEN, ContractsInfo } from '../util/constants';

console.log(DAI_TOKEN);

const MainTokenContract = TruffleContract(
  require("../../build/contracts/MainToken.json")
);
const BridgeContract = TruffleContract(
  require("../../build/contracts/Bridge_v1.json")
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

      const withdraw = new BN(web3.fromWei(10**18, "ether"));
      console.log('withdraw: ', withdraw.toString())
      const result = await tokenContract.approve(bridgeContract.address, withdraw.toString(), { from: account });
      // await tokenContract.send({from: account, gas:70_000}, async (err, txHash) => {
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
