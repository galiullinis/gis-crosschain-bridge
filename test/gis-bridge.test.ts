import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("GisBridge", () => {
    const BSCChainId = 150
    const ETHChainId = 100
    const erc20ETHMintAmount = 1000000
    const erc20ETHSwapAmount = 1000
    let owner: SignerWithAddress;
    let account1: SignerWithAddress;
    let account2: SignerWithAddress;
    let validator: SignerWithAddress;
    let gisBridgeETH: Contract;
    let gisBridgeBSC: Contract;
    let erc20TokenETH: Contract;
    let erc20TokenBSC: Contract;

    beforeEach(async () => {
        [owner, account1, account2, validator] = await ethers.getSigners()
        const GisBridge = await ethers.getContractFactory("GisBridge", owner)
        gisBridgeETH = await GisBridge.deploy(ETHChainId)
        await gisBridgeETH.deployed()
        gisBridgeBSC = await GisBridge.deploy(BSCChainId)
        await gisBridgeBSC.deployed()

        const GisERC20Token = await ethers.getContractFactory("GisToken", owner)
        erc20TokenETH = await GisERC20Token.deploy("TokenNameETH", "TokenSymbolETH")
        await erc20TokenETH.deployed()
        erc20TokenBSC = await GisERC20Token.deploy("TokenNameBSC", "TokenSymbolBSC")
        await erc20TokenBSC.deployed()
        await gisBridgeETH.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("CHAIN_MANAGER_ROLE")), owner.address)
        await erc20TokenETH.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE")), gisBridgeETH.address)
        await erc20TokenETH.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE")), owner.address)
        await erc20TokenETH.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE")), gisBridgeETH.address)

        await erc20TokenBSC.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE")), gisBridgeBSC.address)
        await erc20TokenBSC.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE")), gisBridgeBSC.address)

        await erc20TokenETH.mint(account1.address, erc20ETHMintAmount)
    })

    it("only manager modifier", async () => {
        await expect(gisBridgeETH.connect(account1).includeToken(erc20TokenETH.address, BSCChainId)).to.be.revertedWith("don't have manager role")
    })

    it("swap without include token should be reverted", async () => {
        await expect(gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)).to.be.revertedWith("chain is not supported")
    })

    it("redeem with unsupported chainId should be reverted", async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        const tx = await gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)
        const receipt = await tx.wait()
        const [from, to, amount, nonce, chainIdFrom, chainIdTo] = receipt.events[1].args
        
        const msg = ethers.utils.solidityKeccak256(
            ["address", "uint256", "uint256", "uint256", "uint256"],
            [to, amount, nonce, chainIdFrom, chainIdTo]
        )
        const signature = await owner.signMessage(ethers.utils.arrayify(msg))
        const splitSig = ethers.utils.splitSignature(signature)
        
        await expect(gisBridgeBSC.connect(account2).redeem(erc20TokenBSC.address, from, amount, nonce, ETHChainId, 10, splitSig.v, splitSig.r, splitSig.s)).to.be.revertedWith("chain is not supported")
    })

    it("redeem multiple times should be reverted", async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        const tx = await gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)
        const receipt = await tx.wait()
        const [from, to, amount, nonce, chainIdFrom, chainIdTo] = receipt.events[1].args
        
        const msg = ethers.utils.solidityKeccak256(
            ["address", "address", "uint256", "uint256", "uint256", "uint256"],
            [from, to, amount, nonce, chainIdFrom, chainIdTo]
        )
        const signature = await owner.signMessage(ethers.utils.arrayify(msg))
        const splitSig = ethers.utils.splitSignature(signature)
        
        const tx2 = await gisBridgeBSC.connect(account2).redeem(erc20TokenBSC.address, from, amount, nonce, chainIdFrom, chainIdTo, splitSig.v, splitSig.r, splitSig.s)
        await expect(gisBridgeBSC.connect(account2).redeem(erc20TokenBSC.address, from, amount, nonce, chainIdFrom, chainIdTo, splitSig.v, splitSig.r, splitSig.s)).to.be.revertedWith("transfer in progress")
    })

    it("try multiple swaps", async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        const tx = await gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)
        await expect(gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)).to.be.revertedWith("transfer in progress")
    })

    it("check sign failure with redeem incorrect token amount", async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        const tx = await gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)
        const receipt = await tx.wait()
        const [from, to, amount, nonce, chainIdFrom, chainIdTo] = receipt.events[1].args
        
        const msg = ethers.utils.solidityKeccak256(
            ["address","address","uint256","uint256","uint256","uint256"],
            [from, to, amount, nonce, chainIdFrom, chainIdTo]
        )
        const signature = await owner.signMessage(ethers.utils.arrayify(msg))
        const splitSig = ethers.utils.splitSignature(signature)
        
        await expect(gisBridgeBSC.connect(account2).redeem(erc20TokenBSC.address, from, 1, nonce, chainIdFrom, chainIdTo, splitSig.v, splitSig.r, splitSig.s)).to.be.revertedWith("check sign failure")
        
    })

    it("swap and redeem", async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        const tx = await gisBridgeETH.connect(account1).swap(erc20TokenETH.address, account2.address, erc20ETHSwapAmount, 1, ETHChainId, BSCChainId)
        const receipt = await tx.wait()
        const [from, to, amount, nonce, chainIdFrom, chainIdTo] = receipt.events[1].args
        
        const msg = ethers.utils.solidityKeccak256(
            ["address","address", "uint256", "uint256", "uint256","uint256"],
            [from, to, amount, nonce, chainIdFrom, chainIdTo]
        )
        const signature = await owner.signMessage(ethers.utils.arrayify(msg))
        const splitSig = ethers.utils.splitSignature(signature)
        
        const tx2 = await gisBridgeBSC.connect(account2).redeem(erc20TokenBSC.address, from, amount, nonce, chainIdFrom, chainIdTo, splitSig.v, splitSig.r, splitSig.s)
        
        expect(await erc20TokenETH.balanceOf(account1.address)).to.eq(erc20ETHMintAmount - erc20ETHSwapAmount)
        expect(await erc20TokenBSC.balanceOf(account2.address)).to.eq(erc20ETHSwapAmount)
    })

    it("include only contracts as a token", async () => {
        await expect(gisBridgeETH.includeToken(account1.address, 50)).to.be.revertedWith("sended address is not a contract")
    })

    it("include supported token",async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        await expect(gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)).to.be.revertedWith("token already has supported")
    })

    it("exclude only contracts as a token", async () => {
        await expect(gisBridgeETH.excludeToken(account1.address, 50)).to.be.revertedWith("sended address is not a contract")
    })

    it("exclude unsupported token",async () => {
        await expect(gisBridgeETH.excludeToken(erc20TokenETH.address, BSCChainId)).to.be.revertedWith("token not supported")
    })

    it("exclude token",async () => {
        await gisBridgeETH.includeToken(erc20TokenETH.address, BSCChainId)
        await gisBridgeETH.excludeToken(erc20TokenETH.address, BSCChainId)
        expect(await gisBridgeETH.isTokenSupportsChainId(erc20TokenETH.address, BSCChainId)).to.eq(false)
    })

    it("update chain by id",async () => {
        await gisBridgeETH.updateChainById(1)
        expect(await gisBridgeETH.isChainSupports(1)).to.eq(true)
    })

    it("set zero validator",async () => {
        await expect(gisBridgeETH.setValidator(ethers.constants.AddressZero)).to.be.revertedWith("zero address")
    })

    it("set validator",async () => {
        await gisBridgeETH.setValidator(account1.address)
        expect(await gisBridgeETH.validator()).to.eq(account1.address)
    })
})