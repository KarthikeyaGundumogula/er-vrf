import * as anchor from "@coral-xyz/anchor";
import { Program,web3 } from "@coral-xyz/anchor";
import { ErVrf } from "../target/types/er_vrf";

describe("er-vrf", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.erVrf as Program<ErVrf>;

  it("Initialized player!", async () => {
    const tx = await program.methods.initialize().rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
  });

  it("Send request", async () => {
    const tx = await program.methods.sendVrfReq(0).rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
    const playerPk = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user-acc"), anchor.getProvider().publicKey.toBytes()],
      program.programId,
    )[0];
    await new Promise((resolve) => setTimeout(resolve, 3000));
    let player = await program.account.userAccount.fetch(playerPk, "processed");
    console.log("Player PDA: ", playerPk.toBase58());
    console.log("player: ", player);
  });
});
