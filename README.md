# MediSync360

Welcome to **MediSync360**, a comprehensive capstone project blending modern web development, artificial intelligence, and blockchain technology!

## Overview
MediSync360 is built using a modern tech stack and is divided into three core components:

*   **Frontend**: A responsive web application built with **Next.js** (v16), **React** (v19), and styled using **Tailwind CSS**. It serves as the primary user interface.
*   **Backend**: A robust REST API built using **Node.js** and **Express.js**. Features include:
    *   **MongoDB & Mongoose**: For databases and data modeling.
    *   **Authentication**: Using `jsonwebtoken` (JWT) and `bcryptjs`.
    *   **AI Integration**: Harnessing `@google/generative-ai` (Gemini API) for AI-driven features (e.g., AI symptom checker).
    *   **Blockchain Integration**: Interacting with blockchain networks using `ethers.js`.
*   **Blockchain**: Smart contract development and deployment utilizing **Hardhat**, aimed at providing secure, decentralized record keeping or operations.

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

4.  **Setup Blockchain (Optional/If needed):**
    ```bash
    cd ../blockchain
    npm install
    ```
    *   Run local blockchain node or run tests: `npx hardhat node`

## Collaborators
When pushing changes:
- Keep the work segregated in its respective domains (`frontend`, `backend`, `blockchain`).
- Remember to lint code (`npm run lint` in frontend).
- Ensure any new environment variables correspond with an updated `.env.example` if applicable.

Happy Coding! 🚀
