const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber, utils } = require("ethers")
const fs = require('fs');
const CONFIG = require("../credentials.js");

const provider = new ethers.providers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/"); 
const signer = new ethers.Wallet(CONFIG.wallet.PKEY);
const account = signer.connect(provider);

const routerABI = require("../abis/router.json");
const factoryABI = require("../abis/factory.json");
const pairABI = require("../abis/pair.json");
let tokenABI = (JSON.parse(fs.readFileSync('./artifacts/contracts/Token.sol/Token.json', 'utf8'))).abi;
let sellABI = (JSON.parse(fs.readFileSync('./artifacts/contracts/autoSell.sol/autoSell.json', 'utf8'))).abi;
let helperABI = (JSON.parse(fs.readFileSync('./artifacts/contracts/helper.sol/helper.json', 'utf8'))).abi;

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
    let helperAdd = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    let tokenAdd = "0xf10a046972b2C16D660Da886D2176dC908b8D85F"
    let sellAdd = "0xfFE3919478C3bF5C1A0bcFdF03b94f76C71ACF28"

    let pairAddress;
    let uniswapPair;
    let UNISWAPV2ROUTERADDRESS;
    let FACTORY_ADDRESS;

    helper = new ethers.Contract(
        helperAdd,
        helperABI,
        account,
    )

    token = new ethers.Contract(
        tokenAdd,
        tokenABI,
        account,
    )

    sell = new ethers.Contract(
        sellAdd,
        sellABI,
        account,
    )

  before(async() =>{
    UNISWAPV2ROUTERADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3";
    FACTORY_ADDRESS        = "0xb7926c0430afb07aa7defde6da862ae0bde767bc";
    
    const currentTime = Math.floor(Date.now() / 1000)
    // accounts = await ethers.getSigners();

    const HELPER = await ethers.getContractFactory("helper");
    helper = await HELPER.deploy();
    await helper.deployed();

    const TOKEN = await ethers.getContractFactory("Token");
    token = await TOKEN.deploy("TEST", "TST", ethers.utils.parseEther("1000000000"), UNISWAPV2ROUTERADDRESS, helper.address);
    await token.deployed();

    const SELL = await ethers.getContractFactory("autoSell");
    sell = await SELL.deploy();
    await sell.deployed();

    uniswapRouter  = new ethers.Contract(UNISWAPV2ROUTERADDRESS, routerABI, account);
    uniswapFactory = new ethers.Contract(FACTORY_ADDRESS, factoryABI, account);
    wethAddress    = await uniswapRouter.WETH();
  })    

  it ("should print contract addresses", async () => {
    console.log({
      helper: helper.address,
      token: token.address,
      uniswapRouter: uniswapRouter.address,
      uniswapFactory: uniswapFactory.address,
    //   uniswapPair: uniswapPair.address,
      sell: sell.address
    })
  })

  it("Should set token address", async () => {
    let tx = await helper.setToken(token.address);
    await tx.wait();
  })

//   it("Should add liquidity", async () => {
//     let tx = await token.approve(UNISWAPV2ROUTERADDRESS, ethers.utils.parseEther("1000000"))
//     await tx.wait();
//     tx = await uniswapRouter.addLiquidityETH(token.address, ethers.utils.parseEther("1000000"), 0, 0, account.address, (Date.now() + 100000), {value: ethers.utils.parseEther('0.05')}); // provide 1000 WETH + 100000 token liquidity to uniswap
//     await tx.wait();
    
//     pairAddress    = await uniswapFactory.getPair(wethAddress, token.address);
//     uniswapPair    = new ethers.Contract(pairAddress, pairABI, account);
//   })

//   it("Should set token addresses", async () => {
//     let tx = await token.setAddresses(pairAddress, uniswapRouter.address);
//     await tx.wait();
//   })

//   it("Should set auto sell addresses", async () => {
//     let tx = await sell.setAddresses(pairAddress, uniswapRouter.address);
//     await tx.wait();
//   })

    it ("Should set fee wallet", async () => {
        let tx = await token.setFeeWallet(account.address);
        await tx.wait();
        expect(await token.feeWallet()).to.equal(account.address);
    })

    // TODO change minSale amount and sale tax
    it("Should set min sale amount & sale tax & enable sale tax", async () => {
        let tx = await helper.setMinSaleAmount(ethers.utils.parseEther("5"));
        await tx.wait();
        tx = await helper.setSaleTax("20")
        await tx.wait();
        tx = await helper.toggleSaleTax();
        await tx.wait();
    })

    it("Should whitelist autoSell", async () => {
        tx = await token.addToWhitelist([sell.address], [true]);
        await tx.wait();
    })

    // it("Should transfer tokens to autoSell", async () => {
    //     tx = await token.transfer(sell.address, ethers.utils.parseEther("1000"));
    //     await tx.wait();
    // })

    it("Should approve router to spend tokens", async () => {
        tx = await sell.approveRouter(token.address, ethers.utils.parseEther("1000"));
        await tx.wait();
    })

    // it("Should sell tokens", async () => {
    //     tx = await token.approve(uniswapRouter.address, ethers.utils.parseEther("100"));
    //     await tx.wait();
    //     tx = await uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(ethers.utils.parseEther("10"), 0, [token.address, wethAddress], account.address, (Date.now() + 100000));
    //     await tx.wait();
    // })
});
