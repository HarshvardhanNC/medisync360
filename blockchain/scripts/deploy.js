import hre from "hardhat";

async function main() {
  const MedicalVault = await hre.ethers.getContractFactory("MedicalVault");
  const vault = await MedicalVault.deploy();

  await vault.waitForDeployment();

  console.log(`MedicalVault deployed to: ${await vault.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
