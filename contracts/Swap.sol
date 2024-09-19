// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "./interfaces/IERC20.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract OrderBasedSwap {
    uint256 orderCount;

    struct SwapOrder {
        uint256 id;
        uint256 amountIn;
        uint256 amountOut;
        bool isCompleted;
        bool isCanceled;
        address tokenIn;
        address tokenOut;
        address depositor;
        address buyer;
        uint256 timeCreated;
    }

    // maps orderId to Swap
    mapping(uint => SwapOrder) idToSwapOrder;

    // map depositor to createdOrderIds: This is for depositors to close orders if no buyer shows up
    mapping(address => uint256[]) depositorToCreatedOrderIds;

    // @dev: private functions
    function sanityCheck(address _user) private pure {
        if (_user == address(0)) {
            revert Errors.ZeroAddressNotAllowed();
        }
    }

    function zeroValueCheck(uint256 _amount) private pure {
        if (_amount <= 0) {
            revert Errors.ZeroValueNotAllowed();
        }
    }

    function getUserTokenBalance(
        address _tokenAddress,
        address _user
    ) private view returns (uint) {
        sanityCheck(_tokenAddress);
        sanityCheck(_user);
        return IERC20(_tokenAddress).balanceOf(_user);
    }

    // @user: User functions

    // @dev: deposits an amount of tokens and creates an order simultaneously
    // @user: user approval is needed for this function to run successfully
    function depositTokens(
        uint256 _amountIn,
        address _tokenIn,
        uint256 _amountOut,
        address _tokenOut
    ) external {
        sanityCheck(msg.sender);
        sanityCheck(_tokenIn);
        sanityCheck(_tokenOut);
        zeroValueCheck(_amountIn);
        zeroValueCheck(_amountOut);
        if (_amountIn > getUserTokenBalance(_tokenIn, msg.sender)) {
            revert Errors.InSufficientBalance();
        }
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn);
        uint256 _orderCount = orderCount + 1;
        // on creation, the buyer address is address zero because it has not beebn bought
        // basically like a default address
        SwapOrder memory newSwapOrder = SwapOrder(
            _orderCount,
            _amountIn,
            _amountOut,
            false,
            false,
            _tokenIn,
            _tokenOut,
            msg.sender,
            address(0),
            block.timestamp
        );
        idToSwapOrder[_orderCount] = newSwapOrder;

        depositorToCreatedOrderIds[msg.sender].push(_orderCount);

        orderCount++;

        emit Events.OrderCreatedSuccessfully(
            msg.sender,
            _tokenIn,
            _amountIn,
            _amountOut,
            _tokenOut,
            newSwapOrder.timeCreated
        );
    }
}
