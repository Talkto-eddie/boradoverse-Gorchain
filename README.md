# Boardoverse - Solana PvP Game Contract

A decentralized player-vs-player (PvP) game contract built on Solana using the Anchor framework. This smart contract facilitates secure escrow-based gaming where two players can compete with an authorized arbiter determining the winner.

## 🎮 Overview

Boardoverse enables trustless PvP gaming by:
- Holding player funds in escrow during gameplay
- Using an authorized arbiter to determine winners
- Ensuring fair fund distribution or refunds
- Providing dispute resolution mechanisms

## 🏗️ Architecture

### Game States
- **WaitingForPlayer2**: Game created, waiting for second player to join
- **InProgress**: Both players joined, game is active
- **Finished**: Game completed with declared winner
- **Cancelled**: Game stopped by arbiter with refunds

### Key Components
- **Players**: Two participants who stake funds
- **Arbiter**: Trusted third party who declares winners or cancels games
- **Game Account**: PDA that holds escrowed funds and game state

## 📋 Instructions

### 1. `create_game`
Creates a new game instance with the specified bet amount and arbiter.

**Parameters:**
- `game_id`: Unique string identifier for the game
- `bet_amount`: Amount each player must stake (in lamports)
- `arbiter`: Public key of the authorized arbiter

**Actions:**
- Initializes game account with unique PDA
- Transfers bet amount from player1 to game account
- Sets game status to `WaitingForPlayer2`

### 2. `join_game`
Allows a second player to join an existing game.

**Parameters:**
- `game_id`: The game identifier to join

**Actions:**
- Validates game is waiting for player2
- Prevents self-play (same player can't play against themselves)
- Transfers matching bet amount to game account
- Sets game status to `InProgress`

### 3. `declare_winner`
Enables the arbiter to declare the winner and distribute funds.

**Parameters:**
- `game_id`: The game identifier
- `winner`: Public key of the winning player

**Actions:**
- Validates arbiter authorization
- Ensures game is in progress
- Transfers total pot to declared winner
- Closes game account and refunds rent to arbiter

### 4. `stop_game`
Allows the arbiter to cancel games and issue refunds.

**Parameters:**
- `game_id`: The game identifier

**Actions:**
- **If WaitingForPlayer2**: Refunds bet to player1
- **If InProgress**: Refunds bets to both players equally
- Closes game account and refunds rent to arbiter

## 🔒 Security Features

### Authorization
- Only designated arbiter can declare winners or stop games
- Players cannot manipulate game outcomes
- Proper signer validation on all instructions

### Fund Safety
- Funds held in secure PDA accounts
- Automatic account closure after game completion
- Rent refunds to prevent SOL accumulation

### Game Integrity
- Prevents duplicate game IDs through PDA uniqueness
- State validation ensures proper game flow
- Comprehensive error handling

## 🛠️ Development

### Prerequisites
- Rust 1.70+
- Solana CLI 1.16+
- Anchor Framework 0.28+
- Node.js 16+

### Building
```bash
# Build the program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### Testing
The contract includes comprehensive tests covering:
- Happy path game flows
- Error conditions and edge cases
- Fund distribution scenarios
- Authorization validation

## 📊 Usage Example

```typescript
// 1. Create a game
await program.methods
  .createGame(gameId, betAmount, arbiterPubkey)
  .accounts({
    game: gamePda,
    player1: player1Keypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([player1Keypair])
  .rpc();

// 2. Player2 joins
await program.methods
  .joinGame(gameId)
  .accounts({
    game: gamePda,
    player2: player2Keypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([player2Keypair])
  .rpc();

// 3. Arbiter declares winner
await program.methods
  .declareWinner(gameId, winnerPubkey)
  .accounts({
    game: gamePda,
    arbiter: arbiterKeypair.publicKey,
    player1: player1Pubkey,
    player2: player2Pubkey,
  })
  .signers([arbiterKeypair])
  .rpc();
```

## 🎯 Use Cases

### Gaming Platforms
- Turn-based strategy games
- Card games and tournaments
- Skill-based competitions
- Betting and prediction markets

### Dispute Resolution
- Escrow services for digital goods
- Service completion verification
- Fair competition arbitration

## 🔧 Configuration

### Constants
- `BOARDOVERSE_SEED`: Program seed for PDA generation

### Error Codes
- `InvalidBetAmount`: Bet amount must be greater than 0
- `UnauthorizedArbiter`: Only designated arbiter can perform action
- `GameNotInProgress`: Game must be active for winner declaration
- `CannotPlayAgainstSelf`: Players cannot compete against themselves

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

---

**⚠️ Disclaimer**: This is experimental software. Use at your own risk and always audit smart contracts before mainnet deployment.
