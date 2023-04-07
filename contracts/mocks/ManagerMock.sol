// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

contract ManagerMock  {

    uint256 public currentCycle;

    bool public isRollingOver;

    function getCurrentCycleIndex() external view returns (uint256) {
        return currentCycle;
    }

    function increaseCurrentCycle(uint256 amount) external {
        currentCycle += amount;
    }

    function decreaseCurrentCycle(uint256 amount) external {
        currentCycle -= amount;
    }

    function setCurrentCycle(uint256 value) external {
        currentCycle = value;
    }

    function getRolloverStatus() external view returns (bool) {
        return isRollingOver;
    }

    function setRollover() external {
        isRollingOver = !isRollingOver;
    }

}
