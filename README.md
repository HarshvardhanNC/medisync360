  # MediSync360

MediSync360 is a healthcare platform combining symptom-based disease prediction, insurance claim intelligence, secure medical-report storage, and a real local Ethereum-compatible blockchain demonstration.

This repository contains four cooperating parts:

- `frontend/`: Next.js and React user interface.
- `backend/`: Express and TypeScript API, authentication, MongoDB access, Gemini integration, Cloudinary integration, and Python disease-model bridge.
- `insurance_ai/`: Flask service for insurance claim analysis on port `5001`.
- `blockchain/`: Hardhat local EVM network and the `MedicalReportRegistry` smart contract.

## Features

- User registration, login, JWT authentication, and role-based flows.
- Natural-language symptom analysis with the enhanced Python disease model.
- AI-assisted hospital/provider recommendations.
- Insurance claim prediction, deductions, risk scoring, and recommendations.
- Medical report upload to Cloudinary with SHA-256 hashing.
- Real local blockchain transaction anchoring for report hashes.
- On-chain hash verification that detects modified report files.
- Provider sharing and medical-report vault workflows.

## Architecture

```text
Browser
  |
  v
Next.js frontend :3000
  |
  +--> Express backend :5000 --> MongoDB
  |                         --> Cloudinary
  |                         --> Gemini API (optional features)
  |                         --> Python disease model
  |                         --> Hardhat JSON-RPC :8545
  |
  +--> Flask insurance AI :5001

Hardhat local EVM --> MedicalReportRegistry.sol
```

Medical documents, patient data, permissions, and application metadata stay off-chain. The local smart contract stores only a non-sensitive report ID, file hash, uploader address, and timestamp.

## Prerequisites

Install these before setup:

- Git
- Node.js 20 LTS or newer, with npm
- Python 3.10 to 3.12
- MongoDB local installation or a MongoDB Atlas cluster
- A Cloudinary account for report uploads

Optional:

- Gemini API key for Gemini-backed features
- PowerShell on Windows for the helper scripts

Check versions:

```powershell
node --version
npm --version
python --version
git --version
```

## 1. Clone the repository

```powershell
git clone <repository-url>
cd medisync360
```

Do not commit `.env` files, private keys, API keys, `node_modules`, build output, Hardhat artifacts, or local deployment files. These are ignored by the repository `.gitignore`.

## 2. Install Node dependencies

Run each command from the repository root:

```powershell
cd backend
npm install

cd ..\frontend
npm install

cd ..\blockchain
npm install

cd ..
```

## 3. Configure MongoDB and backend environment

Create the backend environment file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Open `backend/.env` and configure these values:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/medisync360
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000

# Optional Gemini integration
GEMINI_API_KEY=replace-with-your-gemini-key

# Required for medical-report upload/download
CLOUDINARY_CLOUD_NAME=replace-with-your-cloud-name
CLOUDINARY_API_KEY=replace-with-your-api-key
CLOUDINARY_API_SECRET=replace-with-your-api-secret

# Filled after the local contract is deployed
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=replace-with-the-first-hardhat-account-private-key
CONTRACT_ADDRESS=replace-with-the-deployed-contract-address
BLOCKCHAIN_NETWORK=hardhat-local
```

### MongoDB Atlas instead of local MongoDB

Copy the current connection string from Atlas using **Connect -> Drivers**. Do not reuse an old cluster hostname if Atlas no longer shows it.

```env
MONGO_URI=mongodb+srv://<username>:<password>@<current-cluster-host>/medisync360?retryWrites=true&w=majority
```

In Atlas, also add your current IP under **Network Access**. If the password contains characters such as `@`, `#`, `%`, or `/`, URL-encode it.

## 4. Install Python dependencies

The Flask insurance service needs its own dependencies:

```powershell
cd insurance_ai
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd ..
```

The backend disease model is launched by Node through the `python` command. Install its runtime dependencies into the same Python environment:

```powershell
python -m pip install numpy pandas scikit-learn joblib
```

If Windows has multiple Python installations, make sure the same `python` command works from the backend terminal:

```powershell
python -c "import numpy, pandas, sklearn, joblib; print('Python ML dependencies OK')"
```

## 5. Prepare the disease model

The repository includes trained model files under `backend/ml_model/trained_model/`. If model loading fails with errors such as `No module named '_loss'`, regenerate the files using the current Python environment:

```powershell
cd backend\ml_model
python enhanced_train_model.py
cd ..\..
```

This recreates `disease_classifier.pkl`, `label_encoder.pkl`, and `metadata.json` from the project dataset. The training script should be run from `backend/ml_model` because its dataset paths are relative to that directory.

## 6. Start and deploy the local blockchain

The blockchain is real local EVM infrastructure and requires no money, MetaMask, public RPC provider, or funded wallet.

Open Terminal 1:

```powershell
cd blockchain
npm run node
```

Keep this terminal open. Copy the `Private Key` shown for **Account #0**.

Open Terminal 2:

```powershell
cd blockchain
npm run deploy:local
```

Copy the printed `CONTRACT_ADDRESS`.

Set both values in `backend/.env`:

```env
PRIVATE_KEY=<Account-0-private-key-from-hardhat-node>
CONTRACT_ADDRESS=<address-printed-by-deploy:local>
```

Never use the Hardhat development private key on a public or real-money network.

## 7. Start all application services

Use one terminal per service.

### Terminal 3: Backend

```powershell
cd backend
npm run dev
```

Expected endpoint:

```text
http://localhost:5000/api/health
```

### Terminal 4: Insurance AI

```powershell
cd insurance_ai
python app.py
```

Expected endpoint:

```text
http://localhost:5001/health
```

### Terminal 5: Frontend

```powershell
cd frontend
npm run dev
```

Open the application at:

```text
http://localhost:3000
```

The frontend uses `http://localhost:5000/api` for the backend by default. To use another backend URL, set `NEXT_PUBLIC_API_URL` before starting Next.js:

```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:5000/api"
npm run dev
```

## Windows helper scripts

From the repository root:

```powershell
.\start-blockchain.ps1
```

In another terminal, deploy the contract:

```powershell
.\deploy-blockchain.ps1
```

The helper scripts start or deploy the blockchain only. The backend, frontend, and Flask AI service should run in their own terminals so their logs remain visible.

## 8. Verify the installation

Run these checks after starting the services:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5001/health
```

For the local blockchain:

```powershell
Invoke-RestMethod http://127.0.0.1:8545 -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

Expected Hardhat chain ID is `0x7a69`.

For the disease model:

```powershell
cd backend\ml_model
python enhanced_predict_service.py "high fever, headache, retro-orbital pain, myalgia, arthralgia, rash"
cd ..\..
```

The command should return JSON with a predicted condition and confidence.

## 9. Test the main user flows

1. Open `http://localhost:3000`.
2. Register or log in.
3. Open the symptom checker and submit symptoms.
4. Open `/claim-intelligence` and submit an insurance claim scenario.
5. Open the medical vault and upload a PDF, JPG, or PNG.
6. Confirm that the report displays a SHA-256 hash, transaction hash, block number, and `hardhat-local` network.
7. Click **Verify** and confirm the report is marked `Verified`.
8. Use the provider-sharing flow if testing provider access.

## Blockchain behavior

When a report is uploaded:

1. The backend hashes the original file with SHA-256.
2. Cloudinary stores the file.
3. MongoDB stores application metadata.
4. `MedicalReportRegistry.anchorReport()` stores the report ID and hash on the local EVM.
5. The mined transaction hash and block number are stored with the report metadata.

When a report is verified, the backend downloads the file, recalculates the hash, reads the original hash from the smart contract, and compares them. A mismatch produces `Tampered`.

Restarting the Hardhat node resets its local chain. After every node restart, deploy the contract again and update `CONTRACT_ADDRESS` before starting the backend.

## Useful commands

```powershell
# Backend compile
cd backend; npm run build

# Frontend production build
cd ..\frontend; npm run build

# Frontend lint
npm run lint

# Smart-contract tests
cd ..\blockchain; npm test

# Smart-contract compile
npm run compile
```

## Troubleshooting

### MongoDB `ENOTFOUND _mongodb._tcp...`

The Atlas hostname is invalid, stale, or unavailable through DNS. Copy a fresh URI from Atlas using **Connect -> Drivers**, confirm the cluster exists, and check Atlas Network Access. For local MongoDB use:

```env
MONGO_URI=mongodb://127.0.0.1:27017/medisync360
```

### `ECONNREFUSED 127.0.0.1:8545`

The Hardhat node is not running. Start `npm run node` in `blockchain` and keep it open.

### `Blockchain contract is not configured`

Deploy the contract with `npm run deploy:local` and set the printed address in `backend/.env`.

### `No module named '_loss'` or model loading errors

Install the Python ML dependencies and retrain the model:

```powershell
python -m pip install numpy pandas scikit-learn joblib
cd backend\ml_model
python enhanced_train_model.py
```

### Frontend cannot reach backend

Confirm the backend is running on port `5000`, then check `NEXT_PUBLIC_API_URL`. Restart Next.js after changing environment variables.

### Port already in use

Find the process using a port:

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 3000,5000,5001,8545
```

Stop the conflicting process or change the corresponding service port and configuration.

## Security and GitHub checklist

- Never commit `backend/.env` or any other secret file.
- Rotate credentials that have been accidentally shared or committed.
- Never commit MongoDB passwords, Gemini keys, Cloudinary secrets, or wallet private keys.
- Use the Hardhat private key only for the local network.
- Do not store medical documents or personally identifiable information on-chain.
- Keep `.env.example` limited to placeholder values.
- Run `git status --ignored` before pushing to confirm secrets and generated folders are ignored.

## Development notes

The project currently has separate package managers and services. Install dependencies inside each directory rather than from the repository root. The local blockchain is intended for demonstration and development; a public testnet or production network requires a separate RPC provider, deployment wallet, secret management, and contract deployment process.
