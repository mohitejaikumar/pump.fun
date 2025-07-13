import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PumpFun } from "../target/types/pump-fun";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";
import { before } from "mocha";
import BN from "bn.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";


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

    await program.methods.configure({
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

    await program.methods.launch(name, symbol, uri)
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


    
   })
  
});
