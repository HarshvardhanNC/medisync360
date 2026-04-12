// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalVault {
    struct Report {
        string fileHash;
        uint256 timestamp;
        address uploader;
    }

    // Mapping from patient string identifier to an array of recorded reports
    mapping(string => Report[]) private patientReports;

    event ReportAdded(string indexed patientId, string fileHash, uint256 timestamp, address uploader);

    function addReport(string memory _patientId, string memory _fileHash) public {
        require(bytes(_patientId).length > 0, "Patient ID is required");
        require(bytes(_fileHash).length > 0, "File Hash is required");

        Report memory newReport = Report({
            fileHash: _fileHash,
            timestamp: block.timestamp,
            uploader: msg.sender
        });

        patientReports[_patientId].push(newReport);

        emit ReportAdded(_patientId, _fileHash, block.timestamp, msg.sender);
    }

    function getReports(string memory _patientId) public view returns (Report[] memory) {
        return patientReports[_patientId];
    }
}
