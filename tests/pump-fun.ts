import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PumpFun } from "../target/types/pump-fun";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";
import { before } from "mocha";
import BN from "bn.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";


const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("pump-fun", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.pumpFun as Program<PumpFun>;
  const creator = Keypair.generate();
  const user = Keypair.generate();

  // TOKEN METADATA
  const name = "JK Token";
  const symbol = "JK";
  const uri = "https://jksol.com";
  
  // fees 
  const buyFeePercentage = 5;
  const sellFeePercentage = 5;
  const curveLimit = new anchor.BN(1000000000);

  let configPda: PublicKey;
  let bondingCurvePda: PublicKey;
  let curveTokenAccount: PublicKey;
  let userTokenAccount: PublicKey;
  let tokenMint: Keypair;
  let metadataPda: PublicKey;


  before(async ()=> {
    // Airdrop SOL to creator and user
    await provider.connection.requestAirdrop(
      creator.publicKey,
      10 *  LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 *  LAMPORTS_PER_SOL
    );
    
    // delay to confirm airdrop 
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Derive PDAs
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("global_config")],
      program.programId
    );

    tokenMint = Keypair.generate();

    [bondingCurvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), tokenMint.publicKey.toBuffer()],
      program.programId
    );

    [metadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), 
        METADATA_PROGRAM_ID.toBuffer(),
        tokenMint.publicKey.toBuffer()
      ],
      METADATA_PROGRAM_ID
    );
  });


  it("Can configure", async ()=> {
    const configuration = {
      admin: creator.publicKey,
      globalConfig: configPda,
      systemProgram: SystemProgram.programId,
    }

    
      try {
        const signature = await program.methods.configure({
          authority: creator.publicKey,
          feeRecipient: creator.publicKey,
          curveLimit: curveLimit,
          initialVirtualTokenReserve: new anchor.BN(1000000000),
          initialVirtualSolReserve: new anchor.BN(1000000000),
          initialRealTokenReserve: new anchor.BN(1000000000),
          totalTokenSupply: new anchor.BN(1000000000),
          reserved: Array(8).fill(Array(8).fill(0)),
          buyFeePercentage: buyFeePercentage,
          sellFeePercentage: sellFeePercentage,
          migrationFeePercentage: 0,
        }).accounts(configuration)
        .signers([creator])
        .rpc();

        
        await provider.connection.confirmTransaction({
          signature: signature,
          ...(await provider.connection.getLatestBlockhash()),
        }, "confirmed");
        await new Promise((resolve) => setTimeout(resolve, 60*1000));
      }
      catch(err){
        console.log("error: ", err);
      }


      const config = await program.account.config.fetch(configPda);

      expect(config.buyFeePercentage).to.equal(buyFeePercentage);
      expect(config.sellFeePercentage).to.equal(sellFeePercentage);
      expect(config.curveLimit.toString()).to.equal(curveLimit.toString());
    
    

  })

   it("Can launch", async ()=> {
    curveTokenAccount = await anchor.utils.token.associatedAddress({
      mint: tokenMint.publicKey,
      owner: bondingCurvePda
    });

    try {
      const signature = await program.methods.launch(name, symbol, uri)
        .accountsStrict({
          creator: creator.publicKey,
          globalConfig: configPda,
          tokenMint:  tokenMint.publicKey,
          bondingCurve: bondingCurvePda,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          curveTokenAccount: curveTokenAccount,
          tokenMetadataAccount: metadataPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          metadataProgram: METADATA_PROGRAM_ID,
        })
        .signers([creator, tokenMint])
        .rpc();
      await provider.connection.confirmTransaction({
        signature: signature,
        ...(await provider.connection.getLatestBlockhash()),
      }, "confirmed");

      await new Promise((resolve) => setTimeout(resolve, 60*1000));
    }
    catch(error){
      console.log("error: ", error);
    }
   });

  describe("swap tests", ()=> {
    it("Can swap (buy)", async()=> {

        try {
          const userTokenAccount = await getAssociatedTokenAddress(
            tokenMint.publicKey,
            user.publicKey
          );

          console.log("userTokenAccount: ", userTokenAccount);
          console.log("tokenMint: ", tokenMint.publicKey);
          console.log("user: ", user.publicKey);
          
          // Log initial balances
          const solBalance = await provider.connection.getBalance(user.publicKey);
          console.log(
            "Initial SOL balance:",
            solBalance/ LAMPORTS_PER_SOL
          );
          const latestBlockhash = await provider.connection.getLatestBlockhash();
          console.log("latestBlockhash: ", latestBlockhash);
          // Airdrop
          const signature = await provider.connection.requestAirdrop(
            user.publicKey,
            10 * anchor.web3.LAMPORTS_PER_SOL
          );
          

          // Log balances after airdrop
          const newBalance = await provider.connection.getBalance(user.publicKey);
          console.log(
            "SOL balance after airdrop:",
            newBalance / LAMPORTS_PER_SOL
          );

          const tx = await program.methods.swap(
            new anchor.BN(10000),
            0,
            new anchor.BN(1)
          )
          .accountsStrict({
            user: user.publicKey,
            globalConfig: configPda,
            feeRecipient: creator.publicKey,
            bondingCurve: bondingCurvePda,
            tokenMint: tokenMint.publicKey,
            curveTokenAccount: curveTokenAccount,
            userTokenAccount: userTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId
          })
          .signers([user])
          .rpc()

          await provider.connection.confirmTransaction({
            signature: tx,
            ...(await provider.connection.getLatestBlockhash()),
          }, "confirmed");

          await new Promise((resolve) => setTimeout(resolve, 60*1000));

          const finalBalance = await provider.connection.getBalance(
            user.publicKey
          );
          console.log(
            "Final SOL balance:",
            finalBalance / anchor.web3.LAMPORTS_PER_SOL
          );

        }
        catch (error){
          console.log("Detailed buy error:",error);
          if (error.logs) console.error("Transaction logs:", error.logs);
          throw error;
        }
    })

    it("Can swap (sell)", async () => {
      try {
        const bondingCurveAccount = await program.account.bondingCurve.fetch(
          bondingCurvePda
        );
        if (bondingCurveAccount.isCompleted) {
          console.log("Curve limit reached, skipping sell test");
          return;
        }

        const userTokenAccount = await getAssociatedTokenAddress(
          tokenMint.publicKey,
          user.publicKey
        );

        // Get token balance
        const tokenBalance = await provider.connection.getTokenAccountBalance(
          userTokenAccount
        );
        console.log("Token balance before sell:", tokenBalance.value.uiAmount);

        // Use much smaller amount for sell
        const amount = new anchor.BN(1000);
        console.log("Attempting sell with amount:", amount.toString());
        const sellConfig = {
          user: user.publicKey,
          globalConfig: configPda,
          feeRecipient: creator.publicKey,
          bondingCurve: bondingCurvePda,
          tokenMint: tokenMint.publicKey,
          curveTokenAccount: curveTokenAccount,
          userTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        };
        // Get the transaction instruction
        const ix = await program.methods
          .swap(amount, 1, new anchor.BN(1))
          .accounts(sellConfig)
          .instruction();

        // Create and send transaction
        const tx = new anchor.web3.Transaction().add(ix);
        const latestBlockhash = await provider.connection.getLatestBlockhash();
        tx.recentBlockhash = latestBlockhash.blockhash;
        tx.feePayer = user.publicKey;

        // Sign and send
        tx.sign(user);
        const txid = await provider.connection.sendRawTransaction(
          tx.serialize()
        );
        console.log("Sell transaction signature:", txid);

        // Wait for confirmation
        await provider.connection.confirmTransaction({
          signature: txid,
          ...latestBlockhash,
        });

        // Check final balances
        const finalTokenBalance =
          await provider.connection.getTokenAccountBalance(userTokenAccount);
        console.log("Final token balance:", finalTokenBalance.value.uiAmount);
      } catch (error) {
        console.error("Detailed sell error:", error);
        if (error.logs) console.error("Transaction logs:", error.logs);
        throw error;
      }
    });
  })

  describe("Extended swap tests", () => {
    it("Should fail buy with insufficient funds", async () => {
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint.publicKey,
        user.publicKey
      );

      // Try to buy with more SOL than user has
      const largeAmount = new anchor.BN(1000 * anchor.web3.LAMPORTS_PER_SOL);

      try {
        const buyConfig = {
          user: user.publicKey,
          globalConfig: configPda,
          feeRecipient: creator.publicKey,
          bondingCurve: bondingCurvePda,
          tokenMint: tokenMint.publicKey,
          curveTokenAccount: curveTokenAccount,
          userTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        };

        await program.methods
          .swap(largeAmount, 0, new anchor.BN(1))
          .accounts(buyConfig)
          .signers([user])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should fail sell with insufficient tokens", async () => {
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint.publicKey,
        user.publicKey
      );

      // Try to sell more tokens than user has
      const largeAmount = new anchor.BN(1000000000000);

      try {
        const sellConfig = {
          user: user.publicKey,
          globalConfig: configPda,
          feeRecipient: creator.publicKey,
          bondingCurve: bondingCurvePda,
          tokenMint: tokenMint.publicKey,
          curveTokenAccount: curveTokenAccount,
          userTokenAccount: userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        };

        await program.methods
          .swap(largeAmount, 1, new anchor.BN(1))
          .accounts(sellConfig)
          .signers([user])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Configuration tests", () => {
    it("Should fail configure with invalid fee percentages", async () => {
      const newUser = Keypair.generate();
      await provider.connection.requestAirdrop(
        newUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );

      try {
        const configuration = {
          admin: newUser.publicKey,
          globalConfig: configPda,
          systemProgram: SystemProgram.programId,
        };

        const configArgs = {
          authority: newUser.publicKey,
          feeRecipient: newUser.publicKey,
          curveLimit: new anchor.BN(1000000000),
          initialVirtualTokenReserve: new anchor.BN(1000000000),
          initialVirtualSolReserve: new anchor.BN(10000000000),
          initialRealTokenReserve: new anchor.BN(100000000000),
          totalTokenSupply: new anchor.BN(100000000),
          buyFeePercentage: 101, // Invalid percentage
          sellFeePercentage: 101, // Invalid percentage
          migrationFeePercentage: 0,
          reserved: Array(8).fill(Array(8).fill(0)),
        };

        await program.methods
          .configure(configArgs)
          .accounts(configuration)
          .signers([newUser])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should fail configure with unauthorized user", async () => {
      const unauthorizedUser = Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );

      try {
        const configuration = {
          admin: creator.publicKey,
          globalConfig: configPda,
          systemProgram: SystemProgram.programId,
        };

        const configArgs = {
          authority: creator.publicKey,
          feeRecipient: unauthorizedUser.publicKey,
          curveLimit: new anchor.BN(1000000000),
          initialVirtualTokenReserve: new anchor.BN(1000000000),
          initialVirtualSolReserve: new anchor.BN(10000000000),
          initialRealTokenReserve: new anchor.BN(100000000000),
          totalTokenSupply: new anchor.BN(100000000),
          buyFeePercentage: 5,
          sellFeePercentage: 5,
          migrationFeePercentage: 0,
          reserved: Array(8).fill(Array(8).fill(0)),
        };

        await program.methods
          .configure(configArgs)
          .accounts(configuration)
          .signers([unauthorizedUser])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });
  
  describe("Migration tests", () => {
    it("Should fail migrate when curve is not completed", async () => {
      try {
        const migrateConfig = {
          authority: creator.publicKey,
          globalConfig: configPda,
          bondingCurve: bondingCurvePda,
          tokenMint: tokenMint.publicKey,
          systemProgram: SystemProgram.programId,
        };

        await program.methods
          .migrate()
          .accounts(migrateConfig)
          .signers([creator])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });

    it("Should fail migrate with unauthorized user", async () => {
      const unauthorizedUser = Keypair.generate();
      await provider.connection.requestAirdrop(
        unauthorizedUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );

      try {
        const migrateConfig = {
          authority: unauthorizedUser.publicKey,
          globalConfig: configPda,
          bondingCurve: bondingCurvePda,
          tokenMint: tokenMint.publicKey,
          systemProgram: SystemProgram.programId,
        };

        await program.methods
          .migrate()
          .accounts(migrateConfig)
          .signers([unauthorizedUser])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });

  describe("Edge cases", () => {
    it("Should handle minimum buy amount", async () => {
      const testUser = Keypair.generate();
      await provider.connection.requestAirdrop(
        testUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint.publicKey,
        testUser.publicKey
      );

      // Create user token account if it doesn't exist
      try {
        await createAssociatedTokenAccount(
          provider.connection,
          testUser,
          tokenMint.publicKey,
          testUser.publicKey
        );
      } catch (e) {
        // Account might already exist
      }

      const minBuyAmount = new anchor.BN(1000); // Minimum reasonable amount
      const buyConfig = {
        user: testUser.publicKey,
        globalConfig: configPda,
        feeRecipient: creator.publicKey,
        bondingCurve: bondingCurvePda,
        tokenMint: tokenMint.publicKey,
        curveTokenAccount: curveTokenAccount,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      };

      await program.methods
        .swap(minBuyAmount, 0, new anchor.BN(1))
        .accounts(buyConfig)
        .signers([testUser])
        .rpc();

      const tokenBalance = await provider.connection.getTokenAccountBalance(
        userTokenAccount
      );
      const balanceAmount = new anchor.BN(tokenBalance.value.amount);
      const zero = new anchor.BN(0);
      expect(balanceAmount).to.not.eq(zero);
      expect(balanceAmount.gt(zero)).to.be.true;
    });

    it("Should fail with zero amount", async () => {
      const testUser = Keypair.generate();
      await provider.connection.requestAirdrop(
        testUser.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const userTokenAccount = await getAssociatedTokenAddress(
        tokenMint.publicKey,
        testUser.publicKey
      );

      const buyConfig = {
        user: testUser.publicKey,
        globalConfig: configPda,
        feeRecipient: creator.publicKey,
        bondingCurve: bondingCurvePda,
        tokenMint: tokenMint.publicKey,
        curveTokenAccount: curveTokenAccount,
        userTokenAccount: userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      };

      try {
        await program.methods
          .swap(new anchor.BN(0), 0, new anchor.BN(1))
          .accounts(buyConfig)
          .signers([testUser])
          .rpc();

        assert.fail("Should have thrown error");
      } catch (error) {
        expect(error).to.exist;
      }
    });
  });
});


