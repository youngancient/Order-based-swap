// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Errors {
    error ZeroAddressNotAllowed();
    error ZeroValueNotAllowed();
    error OnlyOwnerFunction();
    error UnAuthorizedFunctionCall();
    error InSufficientBalance();
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
}
