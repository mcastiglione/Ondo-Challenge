//SPDX-License-Identifier: ISC
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";
import "./libraries/SwapUtil.sol";
import "./interfaces/IWETH.sol";
import "./interfaces/tokemak/IRewards.sol";
import "./interfaces/tokemak/ILiquidityPool.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Router01.sol";

contract AutoCompounder is Ownable {

    address private _tokeTokenAddress;
    address private _sushiRouterAddress;
    address private _sushiPoolAddress;
    address private _liquidityPoolAddress;
    address private _rewardsAddress;

    event Stake(uint256 amount);

    event AutoCompound(uint256 tokeReward, uint256 lpAmount);

    event WithdrawalRequested(
        address caller,
        uint256 amount
    );

    event Withdrawal(
        address caller,
        uint256 amount
    );

    constructor (
        address tokeTokenAddress,
        address sushiRouterAddress,
        address sushiPoolAddress,
        address liquidityPoolAddress,
        address rewardsAddress
    ) {
        require(tokeTokenAddress != address(0), "invalid tokeTokenAddress");
        require(sushiRouterAddress != address(0), "invalid sushiRouterAddress");
        require(sushiPoolAddress != address(0), "invalid sushiPoolAddress");
        require(liquidityPoolAddress != address(0), "invalid liquidityPoolAddress");
        require(rewardsAddress != address(0), "invalid rewardsAddress");

        _tokeTokenAddress = tokeTokenAddress;
        _sushiRouterAddress = sushiRouterAddress;
        _sushiPoolAddress = sushiPoolAddress;
        _liquidityPoolAddress = liquidityPoolAddress;
        _rewardsAddress = rewardsAddress;
    }

    /**
     * @notice deposit `TOKE-ETH` Sushi LP tokens
     * and stake in Tokemak's Sushi LP token pool
     * can only be called by owner
     * @param amount must be > 0 and pre-approved
     */
    function deposit(
        uint256 amount
    ) external onlyOwner {
        require(amount > 0, "Invalid amount");

        IUniswapV2Pair sushiPool = IUniswapV2Pair(_sushiPoolAddress);

        // Check allowance from sender to contract
        uint256 allowance = sushiPool.allowance(msg.sender, address(this));
        require(allowance >= amount, "Not enough allowance");

        // Transfer funds 
        require(sushiPool.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // approve to tokemak liquidity pool and deposit 
        sushiPool.approve(_liquidityPoolAddress, amount);
        ILiquidityPool(_liquidityPoolAddress).deposit(amount);

        emit Stake(amount);
    }

    /**
     * @notice auto-compound Tokemak's staking rewards
     */
    function autocompound(
        uint256 cycle,
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {

        require(amount > 0, "Invalid amount");
        require(cycle > 0, "Invalid cycle");

        // Required data structure for Tokemak Rewards contract
        IRewards.Recipient memory recipientData = IRewards.Recipient(
            _getChainID(), 
            cycle,
            address(this),
            amount
        );

        // Get current rewards amount and claim
        uint256 claimableAmount = IRewards(_rewardsAddress).getClaimableAmount(recipientData);
        require(claimableAmount > 0, "No available amount to be claimed"); 
        IRewards(_rewardsAddress).claim(recipientData, v,r,s);

        // Get total toke in contract
        uint256 tokeAmount = IERC20(_tokeTokenAddress).balanceOf(address(this));

        // Get sushiSwap pair and calculate swap amounts
        address token0 = IUniswapV2Pair(_sushiPoolAddress).token0();
        address token1 = IUniswapV2Pair(_sushiPoolAddress).token1();

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(_sushiPoolAddress).getReserves();

        address[] memory path = new address[](2);
        uint256 reserves;

        if (token0 == _tokeTokenAddress) {
            reserves = uint256(reserve0);
            path[0] = token0;
            path[1] = token1;
        } else {
            reserves = uint256(reserve1);            
            path[0] = token1;
            path[1] = token0;
        }

        uint256 swapAmount = SwapUtil.getSwapAmount(reserves, tokeAmount);
        tokeAmount -= swapAmount;

        // Approve toke and swap 
        IERC20(_tokeTokenAddress).approve(_sushiRouterAddress, swapAmount);

        uint256 wethAmount = IUniswapV2Router01(_sushiRouterAddress).swapExactTokensForTokens(
            swapAmount, 0, path, address(this), block.timestamp
        )[1];

        IERC20(path[0]).approve(_sushiRouterAddress, tokeAmount);
        IERC20(path[1]).approve(_sushiRouterAddress, wethAmount);

        // Add TOKE-WETH liquidity
        (,, uint256 lpAmount) = IUniswapV2Router01(_sushiRouterAddress).addLiquidity(
            path[0],
            path[1],
            tokeAmount,
            wethAmount,
            0, // TODO: add slippage protection 
            0, // TODO: add slippage protection
            address(this), 
            block.timestamp
        );

        // Stake LP into Tokemak 
        IUniswapV2Pair(_sushiPoolAddress).approve(_liquidityPoolAddress, lpAmount);
        ILiquidityPool(_liquidityPoolAddress).deposit(lpAmount);

        emit AutoCompound(claimableAmount, lpAmount);
        
    }

    /**
     * @notice Request withdrawal of Sushi-Toke LP tokens from Tokemak 
     * @param amount to withdraw
     */
    function requestWithdrawal(
        uint256 amount 
    ) external onlyOwner {
        require(amount > 0, "Invalid amount");

        ILiquidityPool(_liquidityPoolAddress).requestWithdrawal(amount);

        emit WithdrawalRequested(msg.sender, amount);

    }

    /**
     * @notice Execute withdrawal of Sushi-Toke LP tokens from Tokemak
     * must wait at least 1 or 2 cycles since withdrawal request
     * @param amount to withdraw
     */
    function executeWithdrawal(
        uint256 amount 
    ) external onlyOwner {
        require(amount > 0, "Invalid amount");

        ILiquidityPool(_liquidityPoolAddress).withdraw(amount);

        IUniswapV2Pair sushiPool = IUniswapV2Pair(_sushiPoolAddress);
        sushiPool.transfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount);
    }

    function _getChainID() internal view returns (uint256) {
        uint256 id;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            id := chainid()
        }
        return id;
    }

}