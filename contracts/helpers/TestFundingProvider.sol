//SPDX-License-Identifier: ISC
pragma solidity >=0.8.0;

import "hardhat/console.sol";
import "../libraries/SwapUtil.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IUniswapV2Router01.sol";
import "../interfaces/IWETH.sol";

contract TestFundingProvider {

    address public routerAddress;
    address public poolAddress;
    address public tokeAddress;

    constructor(
        address routerAddress_,
        address poolAddress_,
        address tokeAddress_
    ) {

        require(routerAddress_ != address(0), "Invalid routerAddress_");
        require(poolAddress_ != address(0), "Invalid poolAddress_");
        require(tokeAddress_ != address(0), "Invalid tokeAddress_");
        
        routerAddress = routerAddress_;
        poolAddress = poolAddress_;
        tokeAddress = tokeAddress_;
    }

    /**
     * @notice Buy WETH, then swap a part for Toke, 
     * and add liquidity to sushi Toke-WETH pool
     * sends LP to msg.sender
     */
    function getLiquidity() public payable {

        require(msg.value > 0, "Invalid msg.value");

        // eth value
        uint256 ethAmount = msg.value;

        // Define contracts 
        IUniswapV2Router01 router = IUniswapV2Router01(routerAddress);
        IUniswapV2Pair pair = IUniswapV2Pair(poolAddress);

        address[] memory path = new address[](2);
        address token0 = pair.token0();
        address token1 = pair.token1();

        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();

        address wethAddress;
        uint256 reserve;
        
        // Define path and reserves for swapping
        if (token0 == tokeAddress) {
            wethAddress = token1;
            reserve = uint256(reserve1);
            path[0] = token1;
            path[1] = token0;
        } else {
            wethAddress = token0;
            reserve = uint256(reserve0);
            path[0] = token0;
            path[1] = token0;
        }

        // Convert all msg.value into WETH
        IWETH(wethAddress).deposit{value:ethAmount}();

        // How much WETH to Swap for Toke
        uint256 swapAmount = SwapUtil.getSwapAmount(reserve, ethAmount);

        // Substract swapped ether
        ethAmount -= swapAmount;

        // Approve to Sushi and swap
        IWETH(wethAddress).approve(routerAddress, swapAmount);
        uint256 tokeAmount = router.swapExactTokensForTokens(
            swapAmount, 0, path, address(this), block.timestamp
        )[1];

        // Approve to Sushi and add liquidity
        IWETH(wethAddress).approve(routerAddress, ethAmount);
        IERC20(tokeAddress).approve(routerAddress, tokeAmount);

        // As this contract is only used for testing purposes, there is no slippage protection
        router.addLiquidity(wethAddress, tokeAddress, ethAmount, tokeAmount, 0, 0, msg.sender, block.timestamp);

    }

    /**
     * @notice Swap ETH for Toke tokens
     * @param to address to send to
     */
    function swapEthForToke(
        address to
    ) public payable {

        require(msg.value > 0, "Invalid msg.value");

        uint256 ethAmount = msg.value;

        IUniswapV2Router01 router = IUniswapV2Router01(routerAddress);
        IUniswapV2Pair pair = IUniswapV2Pair(poolAddress);

        address[] memory path = new address[](2);
        address token0 = pair.token0();
        address token1 = pair.token1();

        address wethAddress;
        
        // Define path and reserves for swapping
        if (token0 == tokeAddress) {
            wethAddress = token1;
            path[0] = token1;
            path[1] = token0;
        } else {
            wethAddress = token0;
            path[0] = token0;
            path[1] = token0;
        }

        // Convert all msg.value into WETH
        IWETH(wethAddress).deposit{value:ethAmount}();

        // Approve to Sushi and swap
        IERC20(wethAddress).approve(routerAddress, ethAmount);
        uint256 tokeAmount = router.swapExactTokensForTokens(
            ethAmount, 0, path, address(this), block.timestamp
        )[1];

        IERC20(tokeAddress).transfer(to, tokeAmount);

    }

}