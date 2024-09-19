// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Errors {
    error ZeroAddressNotAllowed();
    error ZeroValueNotAllowed();
    error OnlyOwnerFunction();
    error UnAuthorizedFunctionCall();
    error InSufficientBalance();
    error InvalidOrder();
    error OrderCompletedAlready();
    error OrderCanceledAlready();
    error TransferToDepositorFailed();
    error TransferToBuyerFailed();
    error DepositFailed();
    error NotOwnerOfOrder();
}

library Events {
    event OrderCreatedSuccessfully(
        address indexed depositor,
        address indexed _tokenIn,
        uint256 indexed _amountIn,
        uint256 _amountOut,
        address _tokenOut,
        uint256 _timeCreated
    );
    event OrderExecutedSuccessfully(
        address indexed buyer,
        uint256 indexed _amountPaid,
        uint256 indexed _amountReceived,
        address _orderCreator,
        address _tokenPaid,
        address _tokenReceived,
        uint256 _timeExecuted
    );
    event OrderCancelledSuccessfully(
        address indexed depositor,
        address indexed _tokenIn,
        uint256 indexed _amountIn,
        uint256 _timeCancelled
    );
}
