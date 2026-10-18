const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

async function main() {
  const Registry = await ethers.getContractFactory('MedicalReportRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const network = await ethers.provider.getNetwork();
  const deploymentDirectory = path.join(__dirname, '..', 'deployments');

  fs.mkdirSync(deploymentDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentDirectory, 'localhost.json'),
    JSON.stringify(
      {
        contractAddress: address,
        chainId: network.chainId.toString(),
        abi: Registry.interface.formatJson(),
      },
      null,
      2
    )
  );

  console.log(`MedicalReportRegistry deployed to: ${address}`);
  console.log(`RPC_URL=http://127.0.0.1:8545`);
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});