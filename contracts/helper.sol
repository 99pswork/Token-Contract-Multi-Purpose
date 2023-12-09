//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IToken {
    function isWhiteListed(address _address) external view returns (bool);
}

contract helper is Ownable {
    bool public isSaleTaxEnabled;
    bool public isBuyTaxEnabled;
    bool public isTransferTaxEnabled;

    bool public isSaleEnabled = true;

    uint public saleTax;
    uint public buyTax;
    uint public transferTax;

    uint public minSaleAmount;
    uint public minBuyAmount;
    uint public minTransferAmount;

    address public token;

    constructor() {
    }

    function getTransferDetails(
        bool _isSell,
        bool _isBuy,
        bool _isTransfer,
        address _from,
        address _to,
        uint256 _amount
    )external view returns (uint){

        bool isFromWhitelisted = IToken(token).isWhiteListed(_from);
        bool isToWhitelisted = IToken(token).isWhiteListed(_to);

        if (!isSaleEnabled) {
            require(isFromWhitelisted == true, "Token: Cannot transfer tokens at this time");
        }

        uint256 rate = _getTaxRate(_isSell, _isBuy, _isTransfer);
        uint256 taxAmount = _amount*(rate) / 100;

        if (_isSell && !isFromWhitelisted) {
            require(_amount >= minSaleAmount, "Token: Sell amount too low");
        } else if (_isBuy && !isToWhitelisted) {
            require(_amount >= minBuyAmount, "Token: Buy amount too low");
        } else if (_isTransfer && (!isFromWhitelisted && !isToWhitelisted)) {
            require(_amount >= minTransferAmount, "Token: Transfer amount too low");
        } else {
            taxAmount = 0;
        }

        return taxAmount;
    }

    function _getTaxRate(
        bool _isSell,
        bool _isBuy,
        bool _isTransfer
    )internal view returns(uint256){
        if(_isSell && isSaleTaxEnabled)
            return saleTax;
        else if(_isBuy && isBuyTaxEnabled)
            return buyTax;
        else if(_isTransfer && isTransferTaxEnabled)
            return transferTax;
        else    
            return 0;
    }

    function toggleSaleTax() external onlyOwner {
        isSaleTaxEnabled = !isSaleTaxEnabled;
    }

    function toggleBuyTax() external onlyOwner {
        isBuyTaxEnabled = !isBuyTaxEnabled;
    }

    function toggleTransferTax() external onlyOwner {
        isTransferTaxEnabled = !isTransferTaxEnabled;
    }

    function toggleSale() external onlyOwner {
        isSaleEnabled = !isSaleEnabled;
    }

    function setSaleTax(uint _saleTax) external onlyOwner {
        saleTax = _saleTax;
    }

    function setBuyTax(uint _buyTax) external onlyOwner {
        buyTax = _buyTax;
    }

    function setTransferTax(uint _transferTax) external onlyOwner {
        transferTax = _transferTax;
    }

    function setMinSaleAmount(uint _minSaleAmount) external onlyOwner {
        minSaleAmount = _minSaleAmount;
    }

    function setMinBuyAmount(uint _minBuyAmount) external onlyOwner {
        minBuyAmount = _minBuyAmount;
    }

    function setMinTransferAmount(uint _minTransferAmount) external onlyOwner {
        minTransferAmount = _minTransferAmount;
    }

    function setToken(address _token) external onlyOwner {
        token = _token;
    }
}
