# Zero-Knowledge Battle

A privacy-preserving blockchain RPG game that leverages **Fully Homomorphic Encryption (FHE)** technology to enable confidential on-chain battles. Players register with encrypted attributes, fight monsters, and earn encrypted cryptocurrency rewards—all while keeping their stats completely private on the blockchain.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Why Zero-Knowledge Battle?](#why-zero-knowledge-battle)
- [Technology Stack](#technology-stack)
- [How It Works](#how-it-works)
- [Project Architecture](#project-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Local Development](#local-development)
  - [Deployment to Sepolia](#deployment-to-sepolia)
- [Game Mechanics](#game-mechanics)
- [Smart Contract Overview](#smart-contract-overview)
- [Frontend Architecture](#frontend-architecture)
- [Privacy & Security](#privacy--security)
- [Available Scripts](#available-scripts)
- [Roadmap](#roadmap)
- [Technical Deep Dive](#technical-deep-dive)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

---

## Overview

**Zero-Knowledge Battle** is a groundbreaking blockchain gaming application that combines traditional RPG mechanics with cutting-edge cryptography. Using Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine), the game enables players to:

- Register as adventurers with **encrypted attributes** (Attack, Defense, Health)
- Battle monsters using **on-chain encrypted computations**
- Earn **confidential cryptocurrency rewards** (cGold tokens)
- Maintain complete **privacy** of their character statistics on the public blockchain

Unlike traditional blockchain games where all data is transparent, Zero-Knowledge Battle ensures that player stats remain private while still allowing verifiable, fair gameplay through encrypted computation.

---

## Key Features

### 1. **Privacy-Preserving Player Registration**
- Players allocate 10 points across three attributes: Attack, Defense, and Health
- All attributes are **encrypted client-side** before being submitted to the blockchain
- Uses Zama FHE SDK to generate encrypted inputs with cryptographic proofs
- On-chain storage uses `euint16` and `euint32` encrypted types

### 2. **Confidential Battle System**
- Three pre-configured monsters with varying difficulty levels
- Battle outcomes computed **entirely on encrypted data** using FHE operations
- Victory conditions evaluated without revealing player stats
- Fair combat mechanics based on attack/defense comparisons

### 3. **Encrypted Reward Mechanism**
- Winners receive encrypted cGold tokens (`euint64` encrypted ERC-20)
- Only the battle contract can mint rewards, preventing unauthorized token creation
- Token balances remain encrypted on-chain
- Players can decrypt their own balances locally using authenticated requests

### 4. **Dynamic Attribute Management**
- Players can reconfigure their stat allocation at any time
- Must maintain the 10-point total allocation constraint
- Health restoration feature to reset to maximum health
- All updates performed on encrypted values

### 5. **Secure Decryption Interface**
- Client-side decryption through Zama Relayer SDK
- EIP-712 signed decryption requests with time-limited access windows (10 days)
- Keypair generation for each decryption request
- Only account owners can decrypt their own data

---

## Why Zero-Knowledge Battle?

### Problems Solved

#### **1. Privacy in Blockchain Gaming**
Traditional blockchain games expose all player data publicly, enabling:
- **Stat snooping**: Opponents can see your exact power level before engaging
- **Meta-gaming**: Players optimize strategies by analyzing others' builds
- **Unfair advantages**: Whales' assets are visible, creating power imbalances

**Solution**: Zero-Knowledge Battle encrypts all player attributes, making it impossible to analyze opponents before battle. Only battle outcomes are revealed, not the underlying stats.

#### **2. Verifiable Fair Play Without Transparency**
Fully on-chain games need transparency for trust, but this conflicts with competitive gameplay.

**Solution**: FHE allows smart contracts to perform computations on encrypted data, proving fairness without revealing secrets. Battle logic executes on encrypted values, ensuring no tampering while maintaining privacy.

#### **3. Sybil Attack Resistance**
In traditional games, players could create multiple accounts to exploit systems knowing which builds are optimal.

**Solution**: Encrypted stats prevent players from reverse-engineering optimal strategies through mass account testing, as outcomes don't reveal exact stat configurations.

#### **4. Secure Asset Management**
Cryptocurrency rewards in games are typically transparent, making players targets for social engineering or attacks.

**Solution**: Encrypted token balances (cGold) keep wealth private. Only owners can decrypt their holdings through authenticated requests.

---

## Technology Stack

### Smart Contracts
- **Solidity**: v0.8.27 with FHEVM support
- **Hardhat**: Development environment and testing framework (v2.26.0)
- **FHEVM (Zama)**: Fully Homomorphic Encryption Virtual Machine
  - `@fhevm/solidity` (v0.8.0): Core FHE smart contract library
  - `@fhevm/hardhat-plugin` (v0.1.0): Hardhat integration for FHE
  - `encrypted-types` (v0.0.4): Type definitions for encrypted values
  - `new-confidential-contracts` (v0.1.1): Confidential ERC-20 token standard
- **OpenZeppelin Contracts**: Access control patterns (Ownable)
- **ethers.js** (v6.15.0): Web3 library for contract interaction
- **TypeChain**: Automatic TypeScript bindings generation
- **Hardhat Deploy**: Deterministic deployment system

### Frontend
- **React** (v19.1.1): Modern UI framework
- **TypeScript** (v5.8.3): Type-safe development
- **Vite** (v7.1.6): Fast build tool and dev server
- **Wagmi** (v2.17.0): React hooks for Ethereum
- **Viem** (v2.37.6): Lightweight TypeScript Ethereum client (contract reads)
- **ethers.js** (v6.15.0): Contract writes with signer support
- **RainbowKit** (v2.2.8): Beautiful wallet connection UI
- **React Query** (v5.89.0): Async state management
- **Zama Relayer SDK** (v0.2.0): Client-side FHE decryption interface

### Development Tools
- **Mocha/Chai**: Test framework with assertion library
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Solhint**: Solidity-specific linting
- **TypeScript**: Static type checking across the stack

---

## How It Works

### Game Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    1. WALLET CONNECTION                         │
│  Player connects wallet → RainbowKit UI → Wagmi integration     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    2. PLAYER REGISTRATION                       │
│  • Allocate 10 points (Attack/Defense/Health)                   │
│  • Zama SDK encrypts values client-side                         │
│  • Generate cryptographic proof                                 │
│  • Submit encrypted data to smart contract                      │
│  • Contract stores euint16/euint32 encrypted values             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 3. MONSTER SELECTION & BATTLE                   │
│  • Frontend fetches monster roster (unencrypted)                │
│  • Player selects target monster                                │
│  • Contract executes FHE operations:                            │
│    - canWin = FHE.ge(playerAttack, monsterDefense)              │
│    - canSurvive = FHE.ge(playerDefense + playerHealth,          │
│                          monsterAttack)                         │
│    - victory = FHE.and(canWin, canSurvive)                      │
│  • If victory → mint encrypted cGold rewards                    │
│  • If defeat → reduce defense by monster's defense value        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               4. STATS DECRYPTION (OPTIONAL)                    │
│  • Player requests decryption via Relayer SDK                   │
│  • Generate ephemeral keypair                                   │
│  • Sign EIP-712 decryption request                              │
│  • Zama relayer decrypts and returns values                     │
│  • Decrypted stats displayed in browser only                    │
└─────────────────────────────────────────────────────────────────┘
```

### Encryption & Decryption Flow

**Client-Side Encryption (Registration/Updates):**
```javascript
// 1. Create encrypted input
const input = await instance.createEncryptedInput(contractAddress, userAddress);

// 2. Add encrypted values
input.add16(attackValue);
input.add16(defenseValue);
input.add32(healthValue);

// 3. Generate proof and handles
const encryptedData = await input.encrypt();

// 4. Submit to contract
await contract.registerPlayer(
  encryptedData.handles[0], // attack handle
  encryptedData.handles[1], // defense handle
  encryptedData.handles[2], // health handle
  encryptedData.inputProof
);
```

**On-Chain Computation (Battle Logic):**
```solidity
// All operations work on encrypted values
ebool canWin = TFHE.ge(player.attack, monster.defense);
ebool canSurvive = TFHE.ge(
  TFHE.add(player.defense, player.health),
  monster.attack
);
ebool victory = TFHE.and(canWin, canSurvive);

// Conditional execution on encrypted boolean
TFHE.select(victory, rewardAmount, zeroCash);
```

**Client-Side Decryption (Stats Viewing):**
```javascript
// 1. Generate decryption keypair
const { publicKey, privateKey, signature } = await generateKeypair();

// 2. Create signed decryption request
const decryptionRequest = await createDecryptionRequest(
  contractAddress,
  userAddress,
  publicKey,
  signature
);

// 3. Zama relayer decrypts and returns
const decryptedValue = await relayer.decrypt(decryptionRequest, privateKey);
```

---

## Project Architecture

```
Zero-Knowledge-Battle/
│
├── contracts/                          # Smart contract source code
│   ├── ZeroKnowledgeBattle.sol         # Main game logic with FHE
│   ├── ConfidentialGold.sol            # Encrypted ERC-20 token
│   └── FHECounter.sol                  # Reference FHE example
│
├── frontend/                           # React application
│   ├── src/
│   │   ├── App.tsx                     # Root component with providers
│   │   ├── main.tsx                    # Entry point
│   │   ├── config/
│   │   │   ├── contracts.ts            # ABIs and addresses
│   │   │   └── wagmi.ts                # Wagmi configuration
│   │   ├── components/
│   │   │   ├── BattleApp.tsx           # Main game component
│   │   │   ├── AttributeAllocator.tsx  # Stat distribution UI
│   │   │   ├── MonsterList.tsx         # Monster roster
│   │   │   ├── PlayerStats.tsx         # Player info display
│   │   │   └── Header.tsx              # Navigation + wallet
│   │   ├── hooks/
│   │   │   ├── useZamaInstance.ts      # Zama SDK initialization
│   │   │   └── useEthersSigner.ts      # Wagmi → ethers bridge
│   │   └── styles/                     # CSS modules
│   ├── index.html                      # HTML entry (loads Zama SDK)
│   ├── package.json                    # Frontend dependencies
│   └── vite.config.ts                  # Vite configuration
│
├── deploy/
│   └── deploy.ts                       # Hardhat deploy script
│
├── tasks/
│   ├── zeroKnowledgeBattle.ts          # Custom Hardhat tasks
│   └── accounts.ts                     # Account management
│
├── test/
│   └── ZeroKnowledgeBattle.ts          # Mocha/Chai test suite
│
├── types/                              # TypeChain generated types
├── artifacts/                          # Compiled contract artifacts
├── deployments/                        # Deployment records
│   └── sepolia/                        # Sepolia deployment data
│       ├── ZeroKnowledgeBattle.json
│       └── ConfidentialGold.json
│
├── hardhat.config.ts                   # Hardhat configuration
├── package.json                        # Root dependencies
├── tsconfig.json                       # TypeScript configuration
└── .env                                # Environment variables
```

---

## Getting Started

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Git**: For cloning the repository
- **Wallet**: MetaMask or compatible Web3 wallet
- **Sepolia ETH**: For testnet deployment and testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Zero-Knowledge-Battle.git
   cd Zero-Knowledge-Battle
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Configure environment variables**

   Create a `.env` file in the root directory:
   ```bash
   # Deployment private key (DO NOT commit this!)
   PRIVATE_KEY=your_private_key_here

   # Infura API key for Sepolia access
   INFURA_API_KEY=your_infura_api_key

   # Etherscan API key for contract verification (optional)
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

   **Security Note**: Never commit your `.env` file. It's already in `.gitignore`.

### Local Development

1. **Compile contracts**
   ```bash
   npm run compile
   ```

2. **Run tests**
   ```bash
   npm run test
   ```

3. **Start local FHEVM node**
   ```bash
   npm run chain
   ```

4. **Deploy to local network** (in a new terminal)
   ```bash
   npm run deploy:localhost
   ```

5. **Start frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Deployment to Sepolia

1. **Ensure you have Sepolia ETH** in the account corresponding to your `PRIVATE_KEY`

2. **Deploy contracts**
   ```bash
   npm run deploy:sepolia
   ```

   This will:
   - Deploy `ConfidentialGold` token contract
   - Deploy `ZeroKnowledgeBattle` game contract
   - Set the battle contract as minter on the token
   - Save deployment data to `deployments/sepolia/`

3. **Verify contracts on Etherscan** (optional but recommended)
   ```bash
   npm run verify:sepolia
   ```

4. **Update frontend configuration**

   Copy deployed contract addresses from `deployments/sepolia/*.json` to `frontend/src/config/contracts.ts`:
   ```typescript
   export const BATTLE_CONTRACT_ADDRESS = "0x..."; // From ZeroKnowledgeBattle.json
   export const CGOLD_CONTRACT_ADDRESS = "0x...";  // From ConfidentialGold.json
   ```

5. **Build and deploy frontend**
   ```bash
   cd frontend
   npm run build
   ```

   Deploy the `frontend/dist` folder to your hosting provider (Vercel, Netlify, etc.)

---

## Game Mechanics

### Player Registration

Players must register before participating in battles:

1. **Attribute Allocation**: Distribute exactly 10 points across three stats:
   - **Attack**: Determines ability to overcome monster defense
   - **Defense**: Reduces incoming damage
   - **Health**: Additional damage absorption

2. **Encryption**: Stats are encrypted client-side using Zama SDK

3. **On-Chain Storage**: Encrypted values stored as:
   - `euint16 attack`
   - `euint16 defense`
   - `euint32 health`

### Battle System

#### Monster Roster

Three monsters with varying difficulty:

| Monster ID | Name (Example) | Attack | Defense | Reward |
|------------|----------------|--------|---------|--------|
| 0          | Goblin         | Low    | Low     | Small  |
| 1          | Orc            | Medium | Medium  | Medium |
| 2          | Dragon         | High   | High    | Large  |

*Note: Actual values configured in smart contract*

#### Combat Resolution

Battle outcomes determined by two conditions (computed on encrypted data):

1. **Can Win**: `player.attack >= monster.defense`
2. **Can Survive**: `(player.defense + player.health) >= monster.attack`

**Victory**: Both conditions true → Receive encrypted cGold rewards
**Defeat**: Any condition false → Defense reduced by monster's defense value

### Reward System

- **Victory Rewards**: Encrypted cGold tokens minted to player
- **Token Standard**: Confidential ERC-20 (balances encrypted as `euint64`)
- **Access Control**: Only battle contract can mint tokens
- **Balance Privacy**: Only token owner can decrypt their balance

### Stat Management

Players can modify their attributes at any time:

- **Re-allocation**: Change Attack/Defense/Health distribution
- **Constraint**: Must always total exactly 10 points
- **Health Restoration**: Reset health to maximum value
- **Encryption**: All updates use encrypted operations

---

## Smart Contract Overview

### ZeroKnowledgeBattle.sol

The main game logic contract implementing:

**Core Structures:**
```solidity
struct Player {
    euint16 attack;       // Encrypted attack stat
    euint16 defense;      // Encrypted defense stat
    euint32 health;       // Encrypted health points
    euint32 battleCount;  // Encrypted battle counter
    euint32 victoryCount; // Encrypted victory counter
    bool isActive;        // Registration status
}

struct Monster {
    uint8 attack;
    uint8 defense;
    uint64 reward;
    bool isActive;
}
```

**Key Functions:**
- `registerPlayer(bytes32 attackHandle, bytes32 defenseHandle, bytes32 healthHandle, bytes inputProof)`: Register with encrypted stats
- `attackMonster(uint8 monsterId)`: Initiate battle with monster
- `updateAttributes(bytes32 attackHandle, bytes32 defenseHandle, bytes inputProof)`: Re-allocate stats
- `restoreHealth(bytes32 healthHandle, bytes inputProof)`: Reset health to maximum
- `getPlayerStats(address player)`: Get encrypted stat handles
- `getMonsterInfo(uint8 monsterId)`: Fetch monster data (unencrypted)

**Privacy Features:**
- All player stats stored as encrypted types (`euint16`, `euint32`)
- Battle logic uses FHE operations (`TFHE.ge`, `TFHE.and`, `TFHE.select`)
- Conditional minting based on encrypted victory condition

### ConfidentialGold.sol

Encrypted ERC-20 token contract:

**Features:**
- Encrypted balances (`euint64`)
- Standard ERC-20 interface with encrypted transfers
- Access-controlled minting (only battle contract)
- Owner-only decryption of balances via Zama Relayer

**Key Functions:**
- `mint(address to, uint64 encryptedAmount)`: Mint encrypted tokens (battle contract only)
- `transfer(address to, bytes32 amountHandle, bytes inputProof)`: Transfer encrypted amount
- `balanceOf(address account)`: Returns encrypted balance handle
- `decryptBalance(address account)`: Request balance decryption (authenticated)

---

## Frontend Architecture

### Component Hierarchy

```
App.tsx (Wagmi + RainbowKit + React Query Providers)
└── BattleApp.tsx (Main game logic)
    ├── Header.tsx (Wallet connection)
    ├── PlayerStats.tsx (Stats display + decrypt button)
    ├── AttributeAllocator.tsx (Stat distribution UI)
    └── MonsterList.tsx (Monster roster + attack buttons)
```

### Key Technologies

**State Management:**
- **React Hooks**: Local UI state
- **Wagmi**: Wallet connection state
- **React Query**: Async contract read caching
- **ethers.js Contract**: Contract write operations with signer

**Contract Interaction:**
- **Reads**: Viem (lightweight, fast)
  ```typescript
  const stats = await publicClient.readContract({
    address: BATTLE_CONTRACT_ADDRESS,
    abi: BATTLE_ABI,
    functionName: 'getPlayerStats',
    args: [address]
  });
  ```

- **Writes**: ethers.js (with signer support)
  ```typescript
  const contract = new ethers.Contract(address, abi, signer);
  const tx = await contract.registerPlayer(
    attackHandle,
    defenseHandle,
    healthHandle,
    inputProof
  );
  await tx.wait();
  ```

**Encryption/Decryption:**
- **useZamaInstance Hook**: Initializes Zama SDK instance
- **EncryptedInput Creation**: Generates handles and proofs for contract submission
- **Relayer SDK**: Handles authenticated decryption requests

### Styling

- **No Tailwind**: Pure CSS modules and vanilla CSS
- **Responsive Design**: Mobile-friendly layouts
- **Custom Styling**: Component-specific CSS files

---

## Privacy & Security

### Privacy Guarantees

1. **On-Chain Privacy**:
   - All player stats encrypted with FHE
   - Blockchain observers cannot see attribute values
   - Only encrypted handles and proofs stored on-chain

2. **Computation Privacy**:
   - Battle logic executes on encrypted data
   - Smart contract never decrypts player stats
   - Results computed without revealing inputs

3. **Decryption Access Control**:
   - Only account owners can decrypt their own stats
   - EIP-712 signatures authenticate decryption requests
   - Time-limited access windows (10 days)
   - Keypairs generated per request (ephemeral keys)

### Security Features

1. **Smart Contract Security**:
   - Access control on token minting (Ownable pattern)
   - Input validation for stat allocation (must total 10)
   - Monster existence checks before battles
   - Registration status verification

2. **Cryptographic Security**:
   - FHE provides computational security
   - Cryptographic proofs validate encrypted inputs
   - Zama network handles key management
   - No private keys stored in frontend

3. **Frontend Security**:
   - No environment variables in frontend (hardcoded addresses post-deployment)
   - No localStorage usage (stateless client)
   - HTTPS enforced for production deployments
   - Wallet signatures for all state-changing operations

---

## Available Scripts

### Backend (Root Directory)

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile all Solidity contracts |
| `npm run test` | Run Mocha/Chai test suite |
| `npm run coverage` | Generate test coverage report |
| `npm run lint` | Lint Solidity and TypeScript files |
| `npm run lint:sol` | Lint Solidity files only |
| `npm run lint:ts` | Lint TypeScript files only |
| `npm run prettier:check` | Check code formatting |
| `npm run prettier:write` | Auto-format all files |
| `npm run clean` | Clean build artifacts and cache |
| `npm run chain` | Start local FHEVM node |
| `npm run deploy:localhost` | Deploy to local node |
| `npm run deploy:sepolia` | Deploy to Sepolia testnet |
| `npm run verify:sepolia` | Verify contracts on Etherscan |

### Frontend (frontend/)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint frontend code |

### Hardhat Tasks

```bash
# Get deployed contract addresses
npx hardhat battle:addresses

# List all monsters
npx hardhat battle:monsters

# Decrypt and display player stats (requires private key with permissions)
npx hardhat battle:player --player 0xYourPlayerAddress
```

---

## Roadmap

### Phase 1: Core Mechanics (Current)
- [x] Basic player registration with encrypted stats
- [x] Monster battle system with FHE computations
- [x] Encrypted reward mechanism (cGold token)
- [x] Client-side stat decryption
- [x] Frontend wallet integration
- [x] Sepolia testnet deployment

### Phase 2: Enhanced Gameplay (Q2 2025)
- [ ] **PvP Battles**: Player-vs-player combat with encrypted stats
- [ ] **Equipment System**: Encrypted items that boost attributes
- [ ] **Level Progression**: Experience points and level-up mechanics (all encrypted)
- [ ] **Monster Scaling**: Dynamic difficulty based on player power
- [ ] **Battle History**: Encrypted combat logs

### Phase 3: Economic Layer (Q3 2025)
- [ ] **Marketplace**: Trade encrypted items using cGold
- [ ] **Staking Rewards**: Stake cGold for passive encrypted income
- [ ] **Tournament System**: Scheduled PvP events with prize pools
- [ ] **Guild Mechanics**: Team-based encrypted stat pooling
- [ ] **NFT Integration**: Unique encrypted equipment as NFTs

### Phase 4: Ecosystem Expansion (Q4 2025)
- [ ] **Multi-Chain Deployment**: Expand beyond Sepolia (mainnet, L2s)
- [ ] **Mobile App**: React Native mobile client
- [ ] **Social Features**: Friend system, encrypted leaderboards
- [ ] **Governance**: DAO voting on game parameters
- [ ] **SDK Release**: Developer toolkit for building FHE games

### Phase 5: Advanced Features (2026)
- [ ] **AI-Powered NPCs**: Dynamic monster behavior
- [ ] **Procedural Content**: Randomly generated dungeons
- [ ] **Cross-Game Interoperability**: Use cGold and items in partner games
- [ ] **ZK Rollup Integration**: Scale to millions of players
- [ ] **Metaverse Integration**: VR/AR battle experiences

---

## Technical Deep Dive

### FHE Operations Used

**Comparison Operations:**
```solidity
// Greater than or equal (encrypted)
ebool result = TFHE.ge(encryptedA, encryptedB);
```

**Arithmetic Operations:**
```solidity
// Addition (encrypted + encrypted)
euint32 sum = TFHE.add(encryptedA, encryptedB);

// Subtraction
euint32 difference = TFHE.sub(encryptedA, encryptedB);
```

**Logical Operations:**
```solidity
// AND (encrypted boolean)
ebool both = TFHE.and(conditionA, conditionB);
```

**Conditional Selection:**
```solidity
// Select value based on encrypted condition
euint64 result = TFHE.select(
    encryptedCondition,  // ebool
    valueIfTrue,         // returned if condition is true
    valueIfFalse         // returned if condition is false
);
```

### Gas Optimization

FHE operations are computationally expensive. Optimizations include:

1. **Minimize Encrypted Operations**: Use unencrypted monster stats
2. **Batch Updates**: Combine stat changes in single transaction
3. **Efficient Storage**: Pack related encrypted values
4. **Lazy Decryption**: Only decrypt when user explicitly requests
5. **Caching**: Frontend caches encrypted handles to reduce reads

### Network Configuration

**Hardhat Networks:**
```typescript
networks: {
  hardhat: {
    // Local FHEVM simulation
  },
  anvil: {
    url: "http://127.0.0.1:8545",
    // Local testing
  },
  sepolia: {
    url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
    accounts: [process.env.PRIVATE_KEY],
    // Testnet deployment
  }
}
```

**Frontend Network:**
```typescript
// Only Sepolia configured (no localhost to prevent issues)
const config = getDefaultConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http()
  }
});
```

### Decryption Flow Details

1. **Generate Keypair**:
   ```javascript
   const { publicKey, privateKey } = await generateKeyPair();
   ```

2. **Create Signature**:
   ```javascript
   const eip712Signature = await signer._signTypedData(
     domain,
     types,
     {
       publicKey: publicKey,
       contractAddress: contractAddress,
       userAddress: userAddress,
       validUntil: timestamp + 10 days
     }
   );
   ```

3. **Request Decryption**:
   ```javascript
   const decryptedValue = await relayer.decrypt(
     encryptedHandle,
     publicKey,
     privateKey,
     eip712Signature
   );
   ```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style (use Prettier and ESLint)
- Write tests for new features
- Update documentation for API changes
- Use descriptive commit messages
- Ensure all tests pass before submitting PR

---

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

Key points:
- Free to use, modify, and distribute
- Must retain copyright notice
- No patent grant
- No warranty provided

See the [LICENSE](LICENSE) file for full details.

---

## Support

### Documentation
- **FHEVM Documentation**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Zama Relayer SDK**: [https://docs.zama.ai/protocol/relayer](https://docs.zama.ai/protocol/relayer)
- **Hardhat Setup**: [https://docs.zama.ai/protocol/solidity-guides/getting-started/setup](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)

### Community
- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/Zero-Knowledge-Battle/issues)
- **Zama Discord**: [https://discord.gg/zama](https://discord.gg/zama)
- **Twitter/X**: Follow [@zama_fhe](https://twitter.com/zama_fhe) for updates

### FAQ

**Q: Why use FHE instead of zero-knowledge proofs?**
A: FHE allows computation on encrypted data on-chain, while ZK proofs verify computations done off-chain. For our use case, on-chain encrypted state is crucial for composability and fairness.

**Q: Can players cheat by inspecting the blockchain?**
A: No. All player stats are encrypted. Even if you read the blockchain data, you only see encrypted handles, not the actual values.

**Q: What happens if I lose my decryption key?**
A: Decryption keys are ephemeral (generated per request). Your on-chain encrypted data is secured by the Zama network, not by keys you manage.

**Q: How much does it cost to play?**
A: Only gas fees for Sepolia testnet (very cheap). On mainnet, costs would depend on gas prices and FHE operation complexity.

**Q: Can I play on mobile?**
A: Currently web-only, but mobile wallet support (WalletConnect) works. Native mobile app planned for Phase 4.

---

**Built with privacy-first design by the Zero-Knowledge Battle team**

**Powered by Zama's FHEVM technology**
