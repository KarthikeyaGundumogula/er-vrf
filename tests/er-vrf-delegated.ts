import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { GetCommitmentSignature } from "@magicblock-labs/ephemeral-rollups-sdk";
import { ErDelegatedVrf } from "../target/types/er_delegated_vrf";

describe("er-delegated-vrf", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const providerEphemeralRollup = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.EPHEMERAL_PROVIDER_ENDPOINT ||
        "https://devnet.magicblock.app/",
      {
        wsEndpoint:
          process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet.magicblock.app/",
      },
    ),
    anchor.Wallet.local(),
  );

  console.log("Base Layer Connection: ", provider.connection.rpcEndpoint);
  console.log(
    "Ephemeral Rollup Connection: ",
    providerEphemeralRollup.connection.rpcEndpoint,
  );
  console.log(`Current SOL Public Key: ${anchor.Wallet.local().publicKey}`);

  before(async function () {
    const balance = await provider.connection.getBalance(
      anchor.Wallet.local().publicKey,
    );
    console.log("Current balance is", balance / LAMPORTS_PER_SOL, " SOL", "\n");
  });

  const program = anchor.workspace.erDelegatedVrf as Program<ErDelegatedVrf>;

  const userAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user-acc"), anchor.Wallet.local().publicKey.toBuffer()],
    program.programId,
  )[0];

  console.log("User Account PDA: ", userAccount.toBase58());

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accountsPartial({
        user: anchor.Wallet.local().publicKey,
        userAccount: userAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("User Account initialized: ", tx);
  });
  it("Delegate to Ephemeral Rollup!", async () => {
    const remainingAccounts =
      provider.connection.rpcEndpoint.includes("localhost") ||
      provider.connection.rpcEndpoint.includes("127.0.0.1")
        ? [
            {
              pubkey: new PublicKey(
                "mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev",
              ),
              isSigner: false,
              isWritable: false,
            },
          ]
        : [];

    let tx = await program.methods
      .delegate()
      .accountsPartial({
        user: anchor.Wallet.local().publicKey,
        userAcc: userAccount,
        validator: new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57"),
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc({ skipPreflight: true });

    console.log("\nUser Account Delegated to Ephemeral Rollup: ", tx);

    // Wait for delegation to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  it("Send request after delegation (on ephemeral rollup)", async () => {
    // Build transaction using BASE LAYER program but execute on EPHEMERAL
    let tx = await program.methods
      .sendReq(1)
      .accountsPartial({
        user: providerEphemeralRollup.wallet.publicKey,
        userAcc: userAccount,
      })
      .transaction();

    tx.feePayer = providerEphemeralRollup.wallet.publicKey;

    tx.recentBlockhash = (
      await providerEphemeralRollup.connection.getLatestBlockhash()
    ).blockhash;
    tx = await providerEphemeralRollup.wallet.signTransaction(tx);
    const txHash = await providerEphemeralRollup.sendAndConfirm(tx, [], {
      skipPreflight: true,
    });

    console.log("VRF request transaction signature (ephemeral): ", txHash);

    // Wait for VRF callback on ephemeral rollup
    await new Promise((resolve) => setTimeout(resolve, 5000));

    let player = await providerEphemeralRollup.connection.getAccountInfo(
      userAccount,
    );
    console.log("Player account info on ephemeral rollup: ", player);

    // Fetch using ephemeral connection
    let playerData = await program.account.userAccount.fetch(userAccount, "processed");
    console.log("Player data after delegated VRF callback: ", playerData);
    console.log("Random dice roll result: ", playerData.data);
  });

  it("Commit and undelegate from Ephemeral Rollup!", async () => {
    let info = await providerEphemeralRollup.connection.getAccountInfo(
      userAccount,
    );

    console.log("User Account Info on ephemeral rollup: ", info);
    console.log("User account: ", userAccount.toBase58());

    // IMPORTANT: Use BASE LAYER program instance, not ephemeral
    let tx = await program.methods
      .unDelegate()
      .accounts({
        user: providerEphemeralRollup.wallet.publicKey
      })
      .transaction();

    tx.feePayer = providerEphemeralRollup.wallet.publicKey;

    tx.recentBlockhash = (
      await providerEphemeralRollup.connection.getLatestBlockhash()
    ).blockhash;
    tx = await providerEphemeralRollup.wallet.signTransaction(tx);
    const txHash = await providerEphemeralRollup.sendAndConfirm(tx, [], {
      skipPreflight: false,
    });

    console.log("\nUser Account Undelegated transaction: ", txHash);

    // Wait for commitment signature
    const txCommitSgn = await GetCommitmentSignature(
      txHash,
      providerEphemeralRollup.connection,
    );

    console.log("Commitment signature: ", txCommitSgn);

    // Wait for state to sync back to base layer
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify the account is back on base layer with updated state
    let finalPlayer = await program.account.userAccount.fetch(
      userAccount,
      "confirmed",
    );
    console.log("Final player data on base layer: ", finalPlayer);
  });

  it("Close Account!", async () => {
    const tx = await program.methods
      .closeAcc()
      .accountsPartial({
        user: anchor.Wallet.local().publicKey,
        userAccount: userAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("\nUser Account Closed: ", tx);
  });
});
