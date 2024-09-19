// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import "./interfaces/IERC20.sol";
import "./Utils.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract OrderBasedSwap {
    uint256 public orderCount;

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
        uint256 timeCancelled;
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

    function checkIfOrderExists(uint256 _orderId) private view returns (bool) {
        if (idToSwapOrder[_orderId].id == 0) {
            return false;
        }
        return true;
    }

    // @user: User functions

    function getOrder(uint256 _orderId) external view returns (SwapOrder memory) {
        if (!checkIfOrderExists(_orderId)) {
            revert Errors.InvalidOrder();
        }
        return idToSwapOrder[_orderId];
    }

    function getMyOrders() external view returns (uint256[] memory) {
        sanityCheck(msg.sender);
        return depositorToCreatedOrderIds[msg.sender];
    }

    // @dev: creates an order by allowing deposits X amount of token A expecting Y amount of tokenB in return
    // @user: user approval is needed for this function to run successfully
    function createOrder(
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

        if (
            !IERC20(_tokenIn).transferFrom(msg.sender, address(this), _amountIn)
        ) {
            revert Errors.DepositFailed();
        }

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
            block.timestamp,
            0
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

    // @user: user can buy an order
    // the user needs to approve
    function buyOrder(uint256 _orderId) external {
        sanityCheck(msg.sender);
        zeroValueCheck(_orderId);
        if (!checkIfOrderExists(_orderId)) {
            revert Errors.InvalidOrder();
        }

        SwapOrder memory swapOrder = idToSwapOrder[_orderId];

        if (swapOrder.isCompleted) {
            revert Errors.OrderCompletedAlready();
        }

        if (swapOrder.isCanceled) {
            revert Errors.OrderCanceledAlready();
        }

        uint256 buyerTokenOutBalance = getUserTokenBalance(
            swapOrder.tokenOut,
            msg.sender
        );
        // check if buyer has enough tokens specified by the depositor as tokenOut
        if (swapOrder.amountOut > buyerTokenOutBalance) {
            revert Errors.InSufficientBalance();
        }

        // to prevent reentrancy
        idToSwapOrder[_orderId].isCompleted = true;

        // trasfer amountOut of tokenOut to the depositor
        if (
            !IERC20(swapOrder.tokenOut).transferFrom(
                msg.sender,
                swapOrder.depositor,
                swapOrder.amountOut
            )
        ) {
            revert Errors.TransferToDepositorFailed();
        }

        // transfer amountIn of tokenIn to the buyer
        if (
            !IERC20(swapOrder.tokenIn).transfer(msg.sender, swapOrder.amountIn)
        ) {
            revert Errors.TransferToBuyerFailed();
        }

        emit Events.OrderExecutedSuccessfully(
            msg.sender,
            swapOrder.amountOut,
            swapOrder.amountIn,
            swapOrder.depositor,
            swapOrder.tokenOut,
            swapOrder.tokenIn,
            block.timestamp
        );
    }

    function cancelOrder(uint256 _orderId) external {
        sanityCheck(msg.sender);
        zeroValueCheck(_orderId);
        if (!checkIfOrderExists(_orderId)) {
            revert Errors.InvalidOrder();
        }

        SwapOrder memory swapOrder = idToSwapOrder[_orderId];

        if (swapOrder.depositor != msg.sender) {
            revert Errors.NotOwnerOfOrder();
        }

        if (swapOrder.isCompleted) {
            revert Errors.OrderCompletedAlready();
        }

        if (swapOrder.isCanceled) {
            revert Errors.OrderCanceledAlready();
        }

        idToSwapOrder[_orderId].isCanceled = true;
        idToSwapOrder[_orderId].timeCancelled = block.timestamp;

        if (
            !IERC20(swapOrder.tokenIn).transfer(msg.sender, swapOrder.amountIn)
        ) {
            revert Errors.TransferToDepositorFailed();
        }

        emit Events.OrderCancelledSuccessfully(
            swapOrder.depositor,
            swapOrder.tokenIn,
            swapOrder.amountIn,
            block.timestamp
        );
    }
}
