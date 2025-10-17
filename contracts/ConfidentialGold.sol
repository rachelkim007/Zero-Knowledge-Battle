// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialFungibleToken} from "new-confidential-contracts/token/ConfidentialFungibleToken.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialGold is ConfidentialFungibleToken, SepoliaConfig, Ownable {
    address private _battleContract;

    event BattleContractUpdated(address indexed previousBattleContract, address indexed newBattleContract);

    error ConfidentialGoldUnauthorizedMinter(address caller);

    constructor() ConfidentialFungibleToken("cGold", "cGOLD", "") SepoliaConfig() Ownable(msg.sender) {}

    function battleContract() external view returns (address) {
        return _battleContract;
    }

    function setBattleContract(address newBattleContract) external onlyOwner {
        address previousBattleContract = _battleContract;
        _battleContract = newBattleContract;
        emit BattleContractUpdated(previousBattleContract, newBattleContract);
    }

    function mintBattleReward(address to, euint64 amount) external returns (euint64) {
        if (msg.sender != _battleContract) {
            revert ConfidentialGoldUnauthorizedMinter(msg.sender);
        }

        FHE.allow(amount, to);
        FHE.allowThis(amount);
        return _mint(to, amount);
    }
}
