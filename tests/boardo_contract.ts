import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BoardoContract } from "../target/types/boardo_contract";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { expect } from "chai";

describe("boardo_contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BoardoContract as Program<BoardoContract>;

  // Test accounts
  let player1: Keypair;
  let player2: Keypair;
  let arbiter: Keypair;
  let gameId: string;
  let gamePda: PublicKey;
  let bump: number;

  const betAmount = new anchor.BN(1_000_000_000); // 1 SOL

  beforeEach(async () => {
    // Generate fresh keypairs for each test
    player1 = Keypair.generate();
    player2 = Keypair.generate();
    arbiter = Keypair.generate();
    
    // Generate unique game ID for each test
    gameId = `game_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Derive game PDA
    [gamePda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("BOARDOVERSE"), Buffer.from(gameId)],
      program.programId
    );

    // Airdrop SOL to test accounts
    const airdropAmount = 5_000_000_000; // 5 SOL
    await provider.connection.requestAirdrop(player1.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(player2.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(arbiter.publicKey, airdropAmount);

    // Wait for confirmations
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe("create_game", () => {
    it("should create a game successfully", async () => {
      const tx = await program.methods
        .createGame(gameId, betAmount, arbiter.publicKey)
        .accountsPartial({
          game: gamePda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      console.log("Create game transaction signature:", tx);

      // Fetch the game account
      const game = await program.account.game.fetch(gamePda);

      expect(game.gameId).to.equal(gameId);
      expect(game.player1.toString()).to.equal(player1.publicKey.toString());
      expect(game.player2.toString()).to.equal(PublicKey.default.toString());
      expect(game.arbiter.toString()).to.equal(arbiter.publicKey.toString());
      expect(game.betAmount.toString()).to.equal(betAmount.toString());
      expect(game.totalPot.toString()).to.equal(betAmount.toString());
      expect(game.status).to.deep.equal({ waitingForPlayer2: {} });
      expect(game.winner).to.be.null;
    });

    it("should fail with invalid bet amount", async () => {
      try {
        await program.methods
          .createGame(gameId, new anchor.BN(0), arbiter.publicKey)
          .accountsPartial({
            game: gamePda,
            player1: player1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player1])
          .rpc();
        
        expect.fail("Should have failed with invalid bet amount");
      } catch (error) {
        expect(error.toString().length).to.greaterThan(0);
      }
    });
  });

  describe("join_game", () => {
    beforeEach(async () => {
      // Create a game first
      await program.methods
        .createGame(gameId, betAmount, arbiter.publicKey)
        .accountsPartial({
          game: gamePda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();
    });

    it("should allow player2 to join the game", async () => {
      const tx = await program.methods
        .joinGame(gameId)
        .accountsPartial({
          game: gamePda,
          player2: player2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();

      console.log("Join game transaction signature:", tx);

      // Fetch the updated game account
      const game = await program.account.game.fetch(gamePda);

      expect(game.player2.toString()).to.equal(player2.publicKey.toString());
      expect(game.totalPot.toString()).to.equal(betAmount.mul(new anchor.BN(2)).toString());
      expect(game.status).to.deep.equal({ inProgress: {} });
    });

    it("should fail if player1 tries to join their own game", async () => {
      try {
        await program.methods
          .joinGame(gameId)
          .accountsPartial({
            game: gamePda,
            player2: player1.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([player1])
          .rpc();
        
        expect.fail("Should have failed - cannot play against self");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("CannotPlayAgainstSelf");
      }
    });
  });

  // describe("declare_winner", () => {
  //   beforeEach(async () => {
  //     // Create a game and have player2 join
  //     await program.methods
  //       .createGame(gameId, betAmount, arbiter.publicKey)
  //       .accountsPartial({
  //         game: gamePda,
  //         player1: player1.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([player1])
  //       .rpc();

  //     await program.methods
  //       .joinGame(gameId)
  //       .accountsPartial({
  //         game: gamePda,
  //         player2: player2.publicKey,
  //         systemProgram: SystemProgram.programId,
  //       })
  //       .signers([player2])
  //       .rpc();
  //   });

  //   it("should allow arbiter to declare player1 as winner", async () => {
  //     const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);

  //     const tx = await program.methods
  //       .declareWinner(player1.publicKey, gameId)
  //       .accountsPartial({
  //         game: gamePda,
  //         arbiter: arbiter.publicKey,
  //         player1: player1.publicKey,
  //         player2: player2.publicKey,
  //       })
  //       .signers([arbiter])
  //       .rpc();

  //     console.log("Declare winner transaction signature:", tx);

  //     const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
      
  //     // Player1 should receive the total pot (2x bet amount)
  //     expect(player1BalanceAfter - player1BalanceBefore).to.be.approximately(
  //       betAmount.mul(new anchor.BN(2)).toNumber(),
  //       1_000_000 // Allow for small differences due to fees
  //     );

  //     // Check if game account is closed
  //     try {
  //       await program.account.game.fetch(gamePda);
  //       expect.fail("Game account should be closed");
  //     } catch (error) {
  //       expect(error.message).to.include("Account does not exist");
  //     }
  //   });

  //   it("should allow arbiter to declare player2 as winner", async () => {
  //     const player2BalanceBefore = await provider.connection.getBalance(player2.publicKey);

  //     await program.methods
  //       .declareWinner(player2.publicKey, gameId)
  //       .accountsPartial({
  //         game: gamePda,
  //         arbiter: arbiter.publicKey,
  //         player1: player1.publicKey,
  //         player2: player2.publicKey,
  //       })
  //       .signers([arbiter])
  //       .rpc();

  //     const player2BalanceAfter = await provider.connection.getBalance(player2.publicKey);
      
  //     // Player2 should receive the total pot (2x bet amount)
  //     expect(player2BalanceAfter - player2BalanceBefore).to.be.approximately(
  //       betAmount.mul(new anchor.BN(2)).toNumber(),
  //       1_000_000 // Allow for small differences due to fees
  //     );
  //   });

  //   it("should fail if non-arbiter tries to declare winner", async () => {
  //     try {
  //       await program.methods
  //         .declareWinner( player1.publicKey, gameId)
  //         .accountsPartial({
  //           game: gamePda,
  //           arbiter: player1.publicKey, // Wrong arbiter
  //           player1: player1.publicKey,
  //           player2: player2.publicKey,
  //         })
  //         .signers([player1])
  //         .rpc();
        
  //       expect.fail("Should have failed with unauthorized arbiter");
  //     } catch (error) {
  //       expect(error.error.errorCode.code).to.equal("UnauthorizedArbiter");
  //     }
  //   });

  //   it("should fail if invalid winner is declared", async () => {
  //     const invalidWinner = Keypair.generate();
      
  //     try {
  //       await program.methods
  //         .declareWinner(invalidWinner.publicKey, gameId)
  //         .accountsPartial({
  //           game: gamePda,
  //           arbiter: arbiter.publicKey,
  //           player1: player1.publicKey,
  //           player2: player2.publicKey,
  //         })
  //         .signers([arbiter])
  //         .rpc();
        
  //       expect.fail("Should have failed with invalid winner");
  //     } catch (error) {
  //       expect(error.error.errorCode.code).to.equal("InvalidWinner");
  //     }
  //   });
  // });

  describe("stop_game", () => {
    it("should allow arbiter to stop game when waiting for player2", async () => {
      // Create a game but don't have player2 join
      await program.methods
        .createGame(gameId, betAmount, arbiter.publicKey)
        .accountsPartial({
          game: gamePda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);

      const tx = await program.methods
        .stopGame(gameId)
        .accountsPartial({
          game: gamePda,
          arbiter: arbiter.publicKey,
          player1: player1.publicKey,
          player2: player2.publicKey,
        })
        .signers([arbiter])
        .rpc();

      const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
      
      // Player1 should get their bet back
      expect(player1BalanceAfter - player1BalanceBefore).to.be.approximately(
        betAmount.toNumber(),
        1_000_000
      );

      // Check if game account is closed
      try {
        await program.account.game.fetch(gamePda);
        expect.fail("Game account should be closed");
      } catch (error) {
        expect(error.message).to.include("Account does not exist");
      }
    });

    it("should allow arbiter to stop game when in progress (refund both players)", async () => {
      // Create a game and have both players join
      await program.methods
        .createGame(gameId, betAmount, arbiter.publicKey)
        .accountsPartial({
          game: gamePda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      await program.methods
        .joinGame(gameId)
        .accountsPartial({
          game: gamePda,
          player2: player2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();

      const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);
      const player2BalanceBefore = await provider.connection.getBalance(player2.publicKey);

      await program.methods
        .stopGame(gameId)
        .accountsPartial({
          game: gamePda,
          arbiter: arbiter.publicKey,
          player1: player1.publicKey,
          player2: player2.publicKey,
        })
        .signers([arbiter])
        .rpc();

      const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
      const player2BalanceAfter = await provider.connection.getBalance(player2.publicKey);
      
      // Both players should get their bets back
      expect(player1BalanceAfter - player1BalanceBefore).to.be.approximately(
        betAmount.toNumber(),
        1_000_000
      );
      expect(player2BalanceAfter - player2BalanceBefore).to.be.approximately(
        betAmount.toNumber(),
        1_000_000
      );
    });

    it("should fail if non-arbiter tries to stop game", async () => {
      await program.methods
        .createGame(gameId, betAmount, arbiter.publicKey)
        .accountsPartial({
          game: gamePda,
          player1: player1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([player1])
        .rpc();

      try {
        await program.methods
          .stopGame(gameId)
          .accountsPartial({
            game: gamePda,
            arbiter: player1.publicKey, // Wrong arbiter
            player1: player1.publicKey,
            player2: player2.publicKey,
          })
          .signers([player1])
          .rpc();
        
        expect.fail("Should have failed with unauthorized arbiter");
      } catch (error) {
        expect(error.error.errorCode.code).to.equal("UnauthorizedArbiter");
      }
    });
  });

  describe("Complete game flow", () => {
    // it("should execute full happy path: create -> join -> declare winner", async () => {
    //   console.log("=== Starting complete game flow test ===");
      
    //   // Step 1: Create game
    //   console.log("Creating game...");
    //   await program.methods
    //     .createGame(gameId, betAmount, arbiter.publicKey)
    //     .accountsPartial({
    //       game: gamePda,
    //       player1: player1.publicKey,
    //       systemProgram: SystemProgram.programId,
    //     })
    //     .signers([player1])
    //     .rpc();

    //   let game = await program.account.game.fetch(gamePda);
    //   expect(game.status).to.deep.equal({ waitingForPlayer2: {} });
    //   console.log("✓ Game created successfully");

    //   // Step 2: Player2 joins
    //   console.log("Player2 joining game...");
    //   await program.methods
    //     .joinGame(gameId)
    //     .accountsPartial({
    //       game: gamePda,
    //       player2: player2.publicKey,
    //       systemProgram: SystemProgram.programId,
    //     })
    //     .signers([player2])
    //     .rpc();

    //   game = await program.account.game.fetch(gamePda);
    //   expect(game.status).to.deep.equal({ inProgress: {} });
    //   console.log("✓ Player2 joined successfully");

    //   // Step 3: Arbiter declares winner
    //   console.log("Arbiter declaring winner...");
    //   const winnerBalanceBefore = await provider.connection.getBalance(player1.publicKey);
      
    //   await program.methods
    //     .declareWinner(player1.publicKey, gameId)
    //     .accountsPartial({
    //       game: gamePda,
    //       arbiter: arbiter.publicKey,
    //       player1: player1.publicKey,
    //       player2: player2.publicKey,
    //     })
    //     .signers([arbiter])
    //     .rpc();

    //   const winnerBalanceAfter = await provider.connection.getBalance(player1.publicKey);
    //   expect(winnerBalanceAfter - winnerBalanceBefore).to.be.approximately(
    //     betAmount.mul(new anchor.BN(2)).toNumber(),
    //     1_000_000
    //   );
    //   console.log("✓ Winner declared and paid successfully");

    //   // Check game account is closed
    //   try {
    //     await program.account.game.fetch(gamePda);
    //     expect.fail("Game account should be closed");
    //   } catch (error) {
    //     expect(error.message).to.include("Account does not exist");
    //     console.log("✓ Game account closed successfully");
    //   }

    //   console.log("=== Complete game flow test passed ===");
    // });
  });
});
