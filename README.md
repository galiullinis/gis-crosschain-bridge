# GIS Bridge Project
Smart-contract of Bridge between Ethereum and BCS

Rinkeby Etherscan URL: https://rinkeby.etherscan.io/address/0x4f484A7eB7a873D670b1Ea3e1ca8A40f62eA5340#code
BSCscan testnet URL: https://testnet.bscscan.com/address/0xaceE6656D5978929f2468E365128E19b151f4D0b#code

Custom tasks:
```shell
npx hardhat swap  # списывает токены с пользователя и отправляет event ‘swapInitialized’ на одном блокчейне
npx hardhat redeem  # пользователю отправляются списанные токены на другом блокчейне
```