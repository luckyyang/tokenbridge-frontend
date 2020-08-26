import * as React from "react";
import * as TruffleContract from "truffle-contract";
import * as Web3 from "web3";

const MainTokenContract = TruffleContract(require("../../build/contracts/MainToken.json"));
// import IMainToken from "../contract-interfaces/IMainToken";

interface IMetaWalletProps {
  web3: Web3;
}

interface IMetaWalletState {
  account: string;
  accountError: boolean;
  totalSupply: string;
  contractAddress: string;
}

export default class MetaWallet extends React.Component<IMetaWalletProps, IMetaWalletState> {
  constructor(props) {
    super(props);
    this.state = {
      account: "",
      accountError: false,
      totalSupply: "",
      contractAddress: "",
    };
  }

  public async componentWillMount() {
    if (this.props.web3.eth.accounts.length === 0) {
      this.setState({
        account: "",
        accountError: true,
      });
      return;
    }
    MainTokenContract.setProvider(this.props.web3.currentProvider);
    // let instance: IMainToken;
    let instance;
    try {
      // instance = await MainTokenContract.deployed();
      instance = await MainTokenContract.at("0x2f1F4609180ceDb2cEB63c80cE6eCF94F4C0c394");
      console.log('instance: ', instance)
    } catch (err) {
      alert(err);
      return;
    }
    const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
    const account = accounts[0];
    // const balance  = await instance.getBalance(this.props.web3.eth.accounts[0]);
    let totalSupply;
    try {
      totalSupply = await instance.name();
      console.log('totalSupply: ', totalSupply)
    } catch (error) {
      console.log('error when get totalSupply: ', error)
    }
    this.setState({
      // account: this.props.web3.eth.accounts[0],
      account,
      accountError: false,
      // balance: balance.toString(),
      contractAddress: instance.address,
      totalSupply,
    });
  }

  public render() {
    return (
    <div>
      <h3>MainToken</h3>
      <p>Contract address: {this.state.contractAddress}</p>
      <p>Account: {this.state.accountError ? "No accounts found" : this.state.account}</p>
      <p>totalSupply: {this.state.totalSupply}</p>
    </div>
    );
  }
}
