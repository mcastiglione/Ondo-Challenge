// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity >=0.8.0;

library SwapUtil {

   /**
    * @notice Exactly how much of userIn to swap to get perfectly balanced ratio for LP tokens
    * @dev This code matches Alpha Homora and Zapper
    * @param reserveIn Amount of reserves for asset 0
    * @param userIn Availabe amount of asset 0 to swap
    * @return Amount of userIn to swap for asset 1
    */
    function getSwapAmount(uint256 reserveIn, uint256 userIn)
        internal
        pure
        returns (uint256)
    {
        return
            (sqrt(reserveIn * (userIn * 3988000 + reserveIn * 3988009)) -
            reserveIn *
            1997) / 1994;
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

}
