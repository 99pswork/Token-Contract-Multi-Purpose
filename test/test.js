const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, utils } = require("ethers")
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); 

const routerABI = require("../abis/router.json");
const factoryABI = require("../abis/factory.json");
const pairABI = require("../abis/pair.json");

const advanceBlock = () => new Promise((resolve, reject) => {
  web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: new Date().getTime(),
  }, async (err, result) => {
      if (err) { return reject(err) }
      // const newBlockhash =await web3.eth.getBlock('latest').hash
      return resolve()
  })
})

const advanceBlocks = async (num) => {
  let resp = []
  for (let i = 0; i < num; i += 1) {
      resp.push(advanceBlock())
  }
  await Promise.all(resp)
}

const advancetime = (time) => new Promise((resolve, reject) => {
  web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      id: new Date().getTime(),
      params: [time],
  }, async (err, result) => {
      if (err) { return reject(err) }
      const newBlockhash = (await web3.eth.getBlock('latest')).hash

      return resolve(newBlockhash)
  })
})

describe("TOKEN", function () {

    let pairAddress
    let uniswapPair
    const UNISWAPV2ROUTERADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const FACTORY_ADDRESS        = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

  before(async() =>{
    
    const currentTime = Math.floor(Date.now() / 1000)
    accounts = await ethers.getSigners();

    const HELPER = await ethers.getContractFactory("helper");
    helper = await HELPER.deploy();
    await helper.deployed();

    const TOKEN = await ethers.getContractFactory("Token");
    token = await TOKEN.deploy("TEST", "TST", ethers.utils.parseEther("1000000000"), UNISWAPV2ROUTERADDRESS, helper.address);
    await token.deployed();

    uniswapRouter  = new ethers.Contract(UNISWAPV2ROUTERADDRESS, routerABI, accounts[0]);
    uniswapFactory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, accounts[0]);
    wethAddress    = await uniswapRouter.WETH();
  })    

  it ("should print contract addresses", async () => {
    console.log({
      helper: helper.address,
      token: token.address,
      uniswapRouter: uniswapRouter.address,
      uniswapFactory: uniswapFactory.address,
    //   uniswapPair: uniswapPair.address,
    })
  })

  it("Should set token address", async () => {
    await helper.setToken(token.address);
  })

  it("Should add liquidity", async () => {
    await token.approve(UNISWAPV2ROUTERADDRESS, ethers.utils.parseEther("1000000"))
    await uniswapRouter.addLiquidityETH(token.address, ethers.utils.parseEther("1000000"), 0, 0, accounts[0].address, (Date.now() + 100000), {value: ethers.utils.parseEther('10000')}); // provide 1000 WETH + 100000 token liquidity to uniswap
    
    pairAddress    = await uniswapFactory.getPair(wethAddress, token.address);
    uniswapPair    = new ethers.Contract(pairAddress, pairABI, accounts[0]);
  })

  it("Should set pair address", async () => {
    await token.setAddresses(pairAddress, uniswapRouter.address);
  })

    it ("Should set fee wallet", async () => {
        await token.setFeeWallet(accounts[1].address);
        expect(await token.feeWallet()).to.equal(accounts[1].address);
    })

    it("Should set min sale amount & sale tax & enable sale tax", async () => {
        await helper.setMinSaleAmount(ethers.utils.parseEther("5"));
        await helper.setSaleTax("20")
        await helper.toggleSaleTax();
    })

    it("Should not put tax on buy and transfer", async () => {
        await token.transfer(accounts[2].address, ethers.utils.parseEther("1000"));
        const balance = await token.balanceOf(accounts[2].address);
        console.log({
            balance: ethers.utils.formatEther(balance)
        })
    })

    it("Should buy token", async () => {
        await uniswapRouter.connect(accounts[3]).swapExactETHForTokens(0, [wethAddress, token.address], accounts[3].address, (Date.now() + 100000), {value: ethers.utils.parseEther('1')});
        const balance = await token.balanceOf(accounts[3].address);
        console.log({
            balance: ethers.utils.formatEther(balance)
        })
    })

    it("Should blacklist account", async () => {
        await token.addToBlacklist([accounts[0].address], [true]);
        await expect(token.transfer(accounts[2].address, ethers.utils.parseEther("1000"))).to.be.revertedWith("Token: Cannot transfer tokens from this address")
        await token.addToBlacklist([accounts[0].address], [false]);
    })

    it("Should whitelist account and sell token", async () => {
        await token.addToWhitelist([accounts[0].address], [true]);
        
        await token.approve(uniswapRouter.address, ethers.utils.parseEther("100"));
        await token.connect(accounts[3]).approve(uniswapRouter.address, ethers.utils.parseEther("100"));

        const tokenBalBefAcc0 = await token.balanceOf(accounts[0].address);
        const tokenBalBefAcc3 = await token.balanceOf(accounts[3].address);
        const tokenBalBefAcc1 = await token.balanceOf(accounts[1].address);
        const ethBalBefAcc0 = await provider.getBalance(accounts[0].address);
        const ethBalBefAcc3 = await provider.getBalance(accounts[3].address);
        const ethBalBefAcc1 = await provider.getBalance(accounts[1].address);
        
        await uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.utils.parseEther("10"), 0, [token.address, wethAddress], accounts[0].address, (Date.now() + 100000));
        await uniswapRouter.connect(accounts[3]).swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.utils.parseEther("10"), 0, [token.address, wethAddress], accounts[3].address, (Date.now() + 100000));

        const tokenBalAftAcc0 = await token.balanceOf(accounts[0].address);
        const tokenBalAftAcc3 = await token.balanceOf(accounts[3].address);
        const tokenBalAftAcc1 = await token.balanceOf(accounts[1].address);
        const ethBalAftAcc0 = await provider.getBalance(accounts[0].address);
        const ethBalAftAcc3 = await provider.getBalance(accounts[3].address);
        const ethBalAftAcc1 = await provider.getBalance(accounts[1].address);

        console.log({
            tokenBalBefAcc0: ethers.utils.formatEther(tokenBalBefAcc0),
            tokenBalBefAcc3: ethers.utils.formatEther(tokenBalBefAcc3),
            tokenBalBefAcc1: ethers.utils.formatEther(tokenBalBefAcc1),
            ethBalBefAcc0: ethers.utils.formatEther(ethBalBefAcc0),
            ethBalBefAcc3: ethers.utils.formatEther(ethBalBefAcc3),
            ethBalBefAcc1: ethers.utils.formatEther(ethBalBefAcc1),
            tokenBalAftAcc0: ethers.utils.formatEther(tokenBalAftAcc0),
            tokenBalAftAcc3: ethers.utils.formatEther(tokenBalAftAcc3),
            tokenBalAftAcc1: ethers.utils.formatEther(tokenBalAftAcc1),
            ethBalAftAcc0: ethers.utils.formatEther(ethBalAftAcc0),
            ethBalAftAcc3: ethers.utils.formatEther(ethBalAftAcc3),
            ethBalAftAcc1: ethers.utils.formatEther(ethBalAftAcc1),
        })
    })

    it("Should not sell if less than min sale amount", async () => {
        await expect(uniswapRouter.connect(accounts[3]).swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.utils.parseEther("4"), 0, [token.address, wethAddress], accounts[3].address, (Date.now() + 100000))).to.be.revertedWith("TransferHelper: TRANSFER_FROM_FAILED");
    })

    it("Should toggle sale", async () => {
        await helper.toggleSale();
        await expect(uniswapRouter.connect(accounts[3]).swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.utils.parseEther("10"), 0, [token.address, wethAddress], accounts[3].address, (Date.now() + 100000))).to.be.revertedWith("TransferHelper: TRANSFER_FROM_FAILED");
        await uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.utils.parseEther("10"), 0, [token.address, wethAddress], accounts[0].address, (Date.now() + 100000));
    })
});
