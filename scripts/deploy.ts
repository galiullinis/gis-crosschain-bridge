import hre from 'hardhat';
import "dotenv/config";

const ethers = hre.ethers
const deployChainId = process.env.DEPLOY_CHAIN_ID

async function main() {
    const [signer] = await ethers.getSigners()
    const GisBridge = await ethers.getContractFactory('GisBridge', signer)
    const gisBridge = await GisBridge.deploy(deployChainId)
    await gisBridge.deployed()
    console.log(gisBridge.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });