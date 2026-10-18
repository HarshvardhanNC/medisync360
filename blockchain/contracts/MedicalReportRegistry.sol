// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MedicalReportRegistry {
    struct ReportAnchor {
        string reportId;
        string fileHash;
        address uploader;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => ReportAnchor) private anchors;

    event ReportAnchored(
        bytes32 indexed reportKey,
        string reportId,
        string fileHash,
        address indexed uploader,
        uint256 timestamp
    );

    function anchorReport(string calldata reportId, string calldata fileHash) external {
        bytes32 reportKey = keccak256(bytes(reportId));
        require(bytes(reportId).length > 0, 'Report ID is required');
        require(bytes(fileHash).length > 0, 'File hash is required');
        require(!anchors[reportKey].exists, 'Report is already anchored');

        uint256 anchoredAt = block.timestamp;
        anchors[reportKey] = ReportAnchor({
            reportId: reportId,
            fileHash: fileHash,
            uploader: msg.sender,
            timestamp: anchoredAt,
            exists: true
        });

        emit ReportAnchored(reportKey, reportId, fileHash, msg.sender, anchoredAt);
    }

    function getReport(string calldata reportId)
        external
        view
        returns (ReportAnchor memory)
    {
        return anchors[keccak256(bytes(reportId))];
    }
}