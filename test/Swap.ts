import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre from "hardhat";

describe("OrderBased Swap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOrderBasedSwap() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2] = await hre.ethers.getSigners();

    const SwapContract = await hre.ethers.getContractFactory("OrderBasedSwap");
    const swapContract = await SwapContract.deploy();

    return { swapContract, owner };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { swapContract } = await loadFixture(deployOrderBasedSwap);
    });
  });
});
