import * as React from "react";
import * as Web3 from "web3";
import getWeb3 from "./util/getWeb3";

const appStyles = require("./App.css");
const logo = require("./logo.png");

import MetaWallet from "./components/MetaWallet";

interface IAppState {
  web3: Web3;
}

class App extends React.Component<{}, IAppState> {
  constructor(props) {
    super(props);
    this.state = {
      web3: null,
    };
  }

  public async componentWillMount() {
    const web3 = await getWeb3();
    this.setState({
      web3,
    });
  }

  public render() {
    return (
      <div className={appStyles.app}>
        <div className={appStyles.appHeader}>
          <img src={logo} className={appStyles.appLogo} alt="logo" />
          <h2>Anchor</h2>
          <h3>Anchor is a CKB-ETH Token Bridge</h3>
        </div>
        {this.state.web3 ? <MetaWallet web3={this.state.web3} /> : null}
      </div>
    );
  }
}

export default App;
