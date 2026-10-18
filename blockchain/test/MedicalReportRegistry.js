const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('MedicalReportRegistry', function () {
  async function deployRegistry() {
    const Registry = await ethers.getContractFactory('MedicalReportRegistry');
    const registry = await Registry.deploy();
    await registry.waitForDeployment();
    return registry;
  }

  it('anchors a report hash and emits an event', async function () {
    const registry = await deployRegistry();
    const reportId = 'report-123';
    const fileHash = 'a'.repeat(64);

    await expect(registry.anchorReport(reportId, fileHash))
      .to.emit(registry, 'ReportAnchored')
      .withArgs(
        ethers.keccak256(ethers.toUtf8Bytes(reportId)),
        reportId,
        fileHash,
        (await ethers.getSigners())[0].address,
        anyValue
      );

    const report = await registry.getReport(reportId);
    expect(report.reportId).to.equal(reportId);
    expect(report.fileHash).to.equal(fileHash);
    expect(report.exists).to.equal(true);
  });

  it('rejects duplicate anchoring for the same report', async function () {
    const registry = await deployRegistry();

    await registry.anchorReport('report-123', 'a'.repeat(64));
    await expect(registry.anchorReport('report-123', 'b'.repeat(64))).to.be.revertedWith(
      'Report is already anchored'
    );
  });

  it('rejects empty report IDs and hashes', async function () {
    const registry = await deployRegistry();

    await expect(registry.anchorReport('', 'a'.repeat(64))).to.be.revertedWith(
      'Report ID is required'
    );
    await expect(registry.anchorReport('report-123', '')).to.be.revertedWith(
      'File hash is required'
    );
  });
});

function anyValue() {
  return true;
}