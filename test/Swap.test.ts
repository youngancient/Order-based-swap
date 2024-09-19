import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("OrderBased Swap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTokens() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const WinToken = await hre.ethers.getContractFactory("WinToken");
    const winToken = await WinToken.deploy();

    const CasToken = await hre.ethers.getContractFactory("CasToken");
    const casToken = await WinToken.deploy();

    return { winToken, casToken };
  }

  async function deployOrderBasedSwap() {
    // Contracts are deployed using the first signer/account by default
    const [owner, depositor1, depositor2, buyer1, buyer2, buyer3] =
      await hre.ethers.getSigners();

    const { winToken, casToken } = await loadFixture(deployTokens);

    // send tokens
    const amount = ethers.parseUnits("5000", 18);

    // send winToken
    winToken.transfer(depositor1, amount);
    casToken.transfer(depositor1, amount);

    // send casToken
    casToken.transfer(buyer1, amount);
    winToken.transfer(buyer2, amount);

    const SwapContract = await hre.ethers.getContractFactory("OrderBasedSwap");
    const swapContract = await SwapContract.deploy();

    // making address zero a signer
    await helpers.impersonateAccount(ethers.ZeroAddress);
    const zeroSigner = await ethers.getSigner(ethers.ZeroAddress);

    return {
      swapContract,
      owner,
      winToken,
      casToken,
      depositor1,
      depositor2,
      buyer1,
      buyer2,
      buyer3,
      amount,
      zeroSigner,
    };
  }

  describe("Deployment", function () {
    it("Should deploy Swap Contract successfully", async function () {
      const { swapContract } = await loadFixture(deployOrderBasedSwap);
      expect(await swapContract.orderCount()).to.equal(0);
    });
    it("Should deploy tokens successfully", async function () {
      const {
        winToken,
        casToken,
        depositor1,
        depositor2,
        buyer1,
        buyer2,
        buyer3,
        amount,
      } = await loadFixture(deployOrderBasedSwap);

      expect(await winToken.balanceOf(depositor1)).to.equal(amount);
      expect(await casToken.balanceOf(depositor1)).to.equal(amount);

      expect(await winToken.balanceOf(depositor2)).to.equal(0);
      expect(await casToken.balanceOf(depositor2)).to.equal(0);

      expect(await winToken.balanceOf(buyer1)).to.equal(0);
      expect(await casToken.balanceOf(buyer1)).to.equal(amount);

      expect(await winToken.balanceOf(buyer2)).to.equal(amount);
      expect(await casToken.balanceOf(buyer2)).to.equal(0);

      expect(await winToken.balanceOf(buyer3)).to.equal(0);
      expect(await casToken.balanceOf(buyer3)).to.equal(0);
    });
  });

  describe("Create Order", function () {
    it("Should revert if token address is Zero Address", async function () {
      const { swapContract, depositor1, winToken, casToken } =
        await loadFixture(deployOrderBasedSwap);

      const tokenIn = ethers.ZeroAddress;
      const amountIn = ethers.parseUnits("1000", 18);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      await expect(
        swapContract
          .connect(depositor1)
          .createOrder(amountIn, tokenIn, amountOut, tokenOut)
      ).to.be.revertedWithCustomError(swapContract, "ZeroAddressNotAllowed");
    });
    it("Should revert if either amount in or amount out  is Zero", async function () {
      const { swapContract, depositor1, winToken, casToken } =
        await loadFixture(deployOrderBasedSwap);

      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("0", 18);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("0", 18);

      await expect(
        swapContract
          .connect(depositor1)
          .createOrder(amountIn, tokenIn, amountOut, tokenOut)
      ).to.be.revertedWithCustomError(swapContract, "ZeroValueNotAllowed");
    });

    it("Should revert if depositor balance is not enough", async function () {
      const { swapContract, depositor1, depositor2, winToken, casToken } =
        await loadFixture(deployOrderBasedSwap);

      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      await expect(
        swapContract
          .connect(depositor2)
          .createOrder(amountIn, tokenIn, amountOut, tokenOut)
      ).to.be.revertedWithCustomError(swapContract, "InSufficientBalance");
    });

    it("Should create Swap Order successfully", async function () {
      const { swapContract, depositor1, winToken, casToken } =
        await loadFixture(deployOrderBasedSwap);

      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      await winToken.connect(depositor1).approve(swapContract, amountIn);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      // const currentBlock = await ethers.provider.getBlock("latest");

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      expect(await swapContract.orderCount()).to.equal(1);

      expect(
        (await swapContract.connect(depositor1).getMyOrders()).length
      ).to.equal(1);

      expect(await winToken.balanceOf(swapContract)).to.equal(amountIn);
    });
    it("Should create Multiple Swap Orders successfully", async function () {
      const { swapContract, depositor1, winToken, casToken } =
        await loadFixture(deployOrderBasedSwap);

      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      await winToken
        .connect(depositor1)
        .approve(swapContract, amountIn * BigInt(2));

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      // const currentBlock = await ethers.provider.getBlock("latest");

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      expect(await swapContract.orderCount()).to.equal(2);

      expect(
        (await swapContract.connect(depositor1).getMyOrders()).length
      ).to.equal(2);

      expect(await winToken.balanceOf(swapContract)).to.equal(
        amountIn * BigInt(2)
      );
    });
  });

  describe("Buyer Order", function () {
    it("Should revert if Order Id is invalid", async function () {
      const { swapContract, depositor1, winToken, casToken, buyer1 } =
        await loadFixture(deployOrderBasedSwap);

      // create Order
      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      await winToken.connect(depositor1).approve(swapContract, amountIn);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      // const currentBlock = await ethers.provider.getBlock("latest");

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      // buy Order

      let invalidId = 0;
      await expect(
        swapContract.connect(buyer1).buyOrder(invalidId)
      ).to.be.revertedWithCustomError(swapContract, "ZeroValueNotAllowed");

      invalidId = 5;
      await expect(
        swapContract.connect(buyer1).buyOrder(invalidId)
      ).to.be.revertedWithCustomError(swapContract, "InvalidOrder");
    });
    it("Should revert if buyer does not have enough tokens to fill the order", async function () {
      const { swapContract, depositor1, winToken, casToken, buyer2 } =
        await loadFixture(deployOrderBasedSwap);

      // create Order
      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      await winToken.connect(depositor1).approve(swapContract, amountIn);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      // const currentBlock = await ethers.provider.getBlock("latest");

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      // buy Order
      // buyer2 -> doesnot have enough balance
      let validId = 1;
      await expect(
        swapContract.connect(buyer2).buyOrder(validId)
      ).to.be.revertedWithCustomError(swapContract, "InSufficientBalance");
    });
    it("Should buy order successfully", async function () {
      const { swapContract, depositor1, winToken, casToken, buyer1 } =
        await loadFixture(deployOrderBasedSwap);

      // create Order
      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      await winToken.connect(depositor1).approve(swapContract, amountIn);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      // const currentBlock = await ethers.provider.getBlock("latest");

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      // buy Order
      // buyer1 -> has enough balance
      let validId = 1;
      const order = await swapContract.getOrder(validId);

      const depositorBalanceBefore = await casToken.balanceOf(depositor1);

      await casToken.connect(buyer1).approve(swapContract, order.amountOut);

      await swapContract.connect(buyer1).buyOrder(validId);

      expect((await swapContract.getOrder(validId)).isCompleted).to.be.true;

      // buyer gets amountIn of TokenIn
      expect(await winToken.balanceOf(buyer1)).to.equal(order.amountIn);

      // depositor gets amountOut of TokenOut
      expect(await casToken.balanceOf(depositor1)).to.equal(
        order.amountOut + depositorBalanceBefore
      );
    });
    it("Should revert if order has been completed", async function () {
      const { swapContract, depositor1, winToken, casToken, buyer1 } =
        await loadFixture(deployOrderBasedSwap);

      // create Order
      const tokenIn = winToken;
      const amountIn = ethers.parseUnits("1000", 18);

      await winToken.connect(depositor1).approve(swapContract, amountIn);

      const tokenOut = casToken;
      const amountOut = ethers.parseUnits("2000", 18);

      // const currentBlock = await ethers.provider.getBlock("latest");

      await swapContract
        .connect(depositor1)
        .createOrder(amountIn, tokenIn, amountOut, tokenOut);

      // buy Order
      // buyer1 -> has enough balance
      let validId = 1;
      const order = await swapContract.getOrder(validId);

      const depositorBalanceBefore = await casToken.balanceOf(depositor1);

      await casToken.connect(buyer1).approve(swapContract, order.amountOut);

      await swapContract.connect(buyer1).buyOrder(validId);

     

    });
  });
});
