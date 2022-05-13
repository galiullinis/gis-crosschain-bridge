import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan"
import "solidity-coverage";
import { task } from "hardhat/config";
import 'dotenv/config';
import 'hardhat-gas-reporter'
import 'hardhat-contract-sizer'

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
export default {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.RINKEBY_PRIVATE_KEY]
    },
    bsctestnet: {
      url: "https://data-seed-prebsc-2-s3.binance.org:8545/",
      chainId: 97,
      accounts: [process.env.RINKEBY_PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: `${process.env.BSC_TESTNET_API_KEY}`
  }
};
