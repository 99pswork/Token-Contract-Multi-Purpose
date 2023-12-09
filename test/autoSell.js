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

    let sell;

  before(async() =>{
    
    const currentTime = Math.floor(Date.now() / 1000)
    accounts = await ethers.getSigners();

    const HELPER = await ethers.getContractFactory("helper");
    helper = await HELPER.deploy();
    await helper.deployed();

    const TOKEN = await ethers.getContractFactory("Token");
    token = await TOKEN.deploy("TEST", "TST", ethers.utils.parseEther("1000000000"), UNISWAPV2ROUTERADDRESS, helper.address);
    await token.deployed();

    const SELL = await ethers.getContractFactory("autoSell");
    sell = await SELL.deploy();
    await sell.deployed();

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
      sell: sell.address
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

    console.log({
        uniswapPair: uniswapPair.address,
    })
  })

  it("Should set pair address", async () => {
    await token.setAddresses(pairAddress, uniswapRouter.address);
  })

  it("Should set auto sell addresses", async () => {
    await sell.setAddresses(pairAddress, uniswapRouter.address);
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

    it("Should whitelist autoSell", async () => {
        await token.addToWhitelist([sell.address], [true]);
    })

    it("Should transfer tokens to autoSell", async () => {
        await token.transfer(sell.address, ethers.utils.parseEther("1000"));
    })

    it("Should approve router to spend tokens", async () => {
        await sell.approveRouter(token.address, ethers.utils.parseEther("1000"));
    })

    it("Should withdraw tokens from autoSell", async () => {
        await sell.withdrawTokens(token.address);
        const balance = await token.balanceOf(sell.address);
        expect(balance).to.equal(ethers.utils.parseEther("0"));
        await token.transfer(sell.address, ethers.utils.parseEther("1000"));
    })

    it("Should sell tokens", async () => {
        const tokenBalBef = await token.balanceOf(sell.address);
        const ethBalBef = await provider.getBalance(sell.address);

        await sell.setSellAmount(ethers.utils.parseEther("10"));
        await sell.sellTokens(token.address);

        const tokenBalAft = await token.balanceOf(sell.address);
        const ethBalAft = await provider.getBalance(sell.address);

        console.log({
            tokenBalBef: ethers.utils.formatEther(tokenBalBef),
            tokenBalAft: ethers.utils.formatEther(tokenBalAft),
            ethBalBef: ethers.utils.formatEther(ethBalBef),
            ethBalAft: ethers.utils.formatEther(ethBalAft)
        })
    })

    it("Should withdraw eth", async () => {
        const ethBalBef = await provider.getBalance(sell.address);
        await sell.withdrawETH();
        const ethBalAft = await provider.getBalance(sell.address);

        console.log({
            ethBalBef: ethers.utils.formatEther(ethBalBef),
            ethBalAft: ethers.utils.formatEther(ethBalAft)
        })
    })
});
