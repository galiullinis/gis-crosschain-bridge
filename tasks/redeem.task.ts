import { task } from 'hardhat/config'
import { abi } from '../artifacts/contracts/GisBridge.sol/GisBridge.json'


task("redeem", "Get tokens")
    .addParam("contract", "Contract address")
    .addParam("token", "Token contract address")
    .addParam("amount", "Swap amount")
    .addParam("nonce", "Nonce")
    .addParam("chainId", "Recepient chainId")
    .addParam("signature", "Signature")
    .setAction(async (taskArgs, { ethers }) => {
        const [signer] = await ethers.getSigners()
        const contract = taskArgs.contract
        const token = taskArgs.token
        const amount = taskArgs.amount
        const nonce = taskArgs.nonce
        const chainId = taskArgs.chainId
        const signature = taskArgs.signature
        const splitSig = ethers.utils.splitSignature(signature)
        const gisBridge = new ethers.Contract(
            contract,
            abi,
            signer
        )

        const tx = await gisBridge.redeem(token, amount, nonce, chainId, splitSig.v, splitSig.r, splitSig.s)
        console.log(tx)
    })