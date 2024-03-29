//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IHelper {
    function getTransferDetails(
        bool _isSell,
        bool _isBuy,
        bool _isTransfer,
        address _from,
        address _to,
        uint256 _amount
    )external view returns (uint);
}

contract Token is Ownable, ERC20 {

    address public pairAdd;
    address public routerAdd;
    address public feeWallet;
    address public helper;

    mapping(address => bool) public isWhiteListed;
    mapping(address => bool) public isBlackListed;

    constructor(string memory _name, string memory _symbol, uint _amount, address _routerAdd, address _helper) ERC20(_name, _symbol) {
        _mint(msg.sender, _amount);
        routerAdd = _routerAdd;
        helper = _helper;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    )internal virtual override {
        require(isBlackListed[from] == false, "Token: Cannot transfer tokens from this address");
        require(isBlackListed[to] == false, "Token: Cannot transfer tokens to this address");

        bool isSell = (to == pairAdd || to == routerAdd);
        bool isBuy = (from == pairAdd || from == routerAdd);
        bool isTransfer = (from != pairAdd && from != routerAdd && to != pairAdd && to != routerAdd);
        
        uint fee = IHelper(helper).getTransferDetails(isSell, isBuy, isTransfer, from, to, amount);

        if(fee != 0) {
            super._transfer(from, feeWallet, fee);
        }
        super._transfer(from, to, amount - fee);
    }

    function mint(address _to, uint _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    function burn(address _from, uint _amount) external onlyOwner {
        _burn(_from, _amount);
    }

    function addToWhitelist(address[] calldata _address, bool[] calldata _value) external onlyOwner {
        require(_address.length == _value.length, "Arrays must be the same length");
        for(uint i = 0; i < _address.length; i++) {
            isWhiteListed[_address[i]] = _value[i];
        }
    }

    function addToBlacklist(address[] calldata _address, bool[] calldata _value) external onlyOwner {
        require(_address.length == _value.length, "Arrays must be the same length");
        for(uint i = 0; i < _address.length; i++) {
            isBlackListed[_address[i]] = _value[i];
        }
    }

    function setAddresses(address _pairAdd, address _routerAdd) external onlyOwner {
        pairAdd = _pairAdd;
        routerAdd = _routerAdd;
    }

    function setFeeWallet(address _feeWallet) external onlyOwner {
        feeWallet = _feeWallet;
    }

    function setHelper(address _helper) external onlyOwner {
        helper = _helper;
    }
}