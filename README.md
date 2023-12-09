TESTING

- open two terminals. In first run the following command `npx hardhat node --fork https://mainnet.infura.io/v3/79b3f1fc5ac147598fd01600f8f4a033`

- in second, run `npx hardhat test --network localhost`

DEPLOYMENT (For ethereum and uniswap v2)

- Create credentials.js file based on credentials.js.sample file
- Go to deploy.js file
- On line 7, replace provider with `https://mainnet.infura.io/v3/79b3f1fc5ac147598fd01600f8f4a033`
- On line 81, replace UNISWAPV2ROUTERADDRESS with `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`
- On line 82, replace FACTORY_ADDRESS with `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`
- On line 92, replace name, symbol, minting amount
- On line 148, replace minimum sale amount
- On line 150, set the sale tax

POST CREATING LIQUIDITY PAIR

- on token contract, call setAddresses(pair address, uniswap router addres)
- on auto sell contract, call setAddresses(pair address, uniswap router addres)
