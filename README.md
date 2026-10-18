# MediSync360

Welcome to **MediSync360**, a comprehensive capstone project blending modern web development, artificial intelligence, and blockchain technology!

## Overview
MediSync360 is built using a modern tech stack and is divided into three core components:

*   **Frontend**: A responsive web application built with **Next.js** (v16), **React** (v19), and styled using **Tailwind CSS**. It serves as the primary user interface.
*   **Backend**: A robust REST API built using **Node.js** and **Express.js**. Features include:
    *   **MongoDB & Mongoose**: For databases and data modeling.
    *   **Authentication**: Using `jsonwebtoken` (JWT) and `bcryptjs`.
    *   **AI Integration**: Harnessing `@google/generative-ai` (Gemini API) for AI-driven features (e.g., AI symptom checker).
    *   **Blockchain Integration**: A local Ethereum-compatible blockchain using `ethers.js` and Hardhat. Medical report files remain off-chain; only their SHA-256 integrity proof is anchored on-chain.

## Project Structure

```text
MediSync360/
├── frontend/     # Next.js application (React, Tailwind CSS)
├── backend/      # Node.js + Express API server (MongoDB, Gemini AI, Ethers)
└── blockchain/   # Hardhat project for smart contracts
```

## Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   [MongoDB](https://www.mongodb.com/) (running locally or via MongoDB Atlas)
*   [Git](https://git-scm.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd MediSync360
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    ```
    *   Create a `.env` file in the `backend` directory based on required environment variables (e.g., `PORT`, MongoDB URI, JWT secret, and `GEMINI_API_KEY`).
    *   Start the development server: `npm run dev`

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```
    *   Start the Next.js development server: `npm run dev`

4.  **Setup Local Blockchain:**
    ```bash
    cd ../blockchain
    npm install
    ```
    *   In a separate terminal, start the local node: `npm run node`
    *   In another terminal, deploy the contract: `npm run deploy:local`
    *   Copy the printed `CONTRACT_ADDRESS` into `backend/.env`.

### Backend environment

Copy `backend/.env.example` to `backend/.env` and set:

```env
MONGO_URI=mongodb://localhost:27017/medisync360
JWT_SECRET=replace-with-a-long-random-secret
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=the-first-private-key-printed-by-hardhat-node
CONTRACT_ADDRESS=the-address-printed-by-deploy-blockchain
BLOCKCHAIN_NETWORK=hardhat-local
```

Cloudinary credentials are also required for report upload. Use the existing `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` settings in the backend environment template.

### Start the application

Keep the Hardhat node running, then start the backend and frontend in separate terminals:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

On Windows, `start-blockchain.ps1` and `start-blockchain.bat` start the local node, while the deploy scripts deploy the contract. The node must remain running while the backend is using the blockchain.

### What the blockchain demonstrates

Uploading a report now creates a real local blockchain transaction. The smart contract stores the report ID and SHA-256 file hash, emits a `ReportAnchored` event, and rejects duplicate report IDs. Report verification downloads the file, recomputes its hash, reads the hash from the contract, and reports `Verified` or `Tampered`.

This is a genuine local EVM demonstration and requires no money, MetaMask, public RPC provider, or funded wallet. Restarting the Hardhat node resets its local chain, so redeploy the contract and update `CONTRACT_ADDRESS` when starting a fresh node.

## Collaborators
When pushing changes:
- Keep the work segregated in its respective domains (`frontend`, `backend`, `blockchain`).
- Remember to lint code (`npm run lint` in frontend).
- Ensure any new environment variables correspond with an updated `.env.example` if applicable.

#sample user for testing
abc@gmail.com
123@11
