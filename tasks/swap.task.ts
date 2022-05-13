import { task } from 'hardhat/config'
import { abi } from '../artifacts/contracts/GisBridge.sol/GisBridge.json'


task("swap", "Send tokens to another blockchain")
    .addParam("contract", "Contract address")
    .addParam("token", "Token contract address")
    .addParam("to", "Recepient address")
    .addParam("amount", "Swap amount")
    .addParam("nonce", "Nonce")
    .addParam("chainId", "Recepient chainId")
    .setAction(async (taskArgs, { ethers }) => {
        const [signer] = await ethers.getSigners()
        const contract = taskArgs.contract
        const token = taskArgs.token
        const to = taskArgs.to
        const amount = taskArgs.amount
        const nonce = taskArgs.nonce
        const chainId = taskArgs.chainId
        const gisBridge = new ethers.Contract(
            contract,
            abi,
            signer
        )

        const tx = await gisBridge.swap(token, to, amount, nonce, chainId)
        console.log(tx)
    })