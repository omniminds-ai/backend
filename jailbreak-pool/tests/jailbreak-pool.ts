import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
const assert = require("assert");
import { Tournament } from "../target/types/tournament";

describe("tournament", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Tournament as Program<Tournament>;
  const init_seed = anchor.utils.bytes.utf8.encode("tournament");
  const entry_sum = 100000000000;
  let init_balance = 0;
  
  let tournamentPubKey;

  beforeEach(async () => {
    [tournamentPubKey] = await anchor.web3.PublicKey.findProgramAddressSync(
      [init_seed],
      program.programId
    );
  });

  it("runs the constructor", async () => {
    await program.methods.initialize().accountsStrict({
      tournament: tournamentPubKey,
      authority: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    const tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    assert.equal(tournamentAccount.authority, provider.wallet.publicKey.toString());
    init_balance = await provider.connection.getBalance(tournamentPubKey);
  });

  it("Starts a tournament", async () => {
    const expected_entry_fee = entry_sum / 100;
    const system_prompt_hash = Array.from(new Uint8Array(32).fill(0));
    await program.methods.startTournament(system_prompt_hash, new anchor.BN(entry_sum)).accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    const tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    assert.equal(tournamentAccount.entryFee, expected_entry_fee);
    const balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance - init_balance, entry_sum);
  });

  it("Submits some solutions", async () => {
    let tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    const entry_fee = tournamentAccount.entryFee;
    const solution_hash = Array.from(new Uint8Array(32).fill(1));
    await program.methods.submitSolution(solution_hash).accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    // Match Rust's calculation: fee + fee * 1/100
    const expected_fee = entry_fee.add(entry_fee.muln(1).divn(100));
    assert.equal(tournamentAccount.entryFee.toString(), expected_fee.toString());
    const balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance - init_balance, entry_sum + entry_fee.toNumber());
  });

  it("Concludes a tournament", async () => {
    await program.methods.concludeTournament().accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey,
      winnerAccount: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    let balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance, init_balance);
  });

  it("Starts a second tournament", async () => {
    let system_prompt_hash = Array.from(new Uint8Array(32).fill(2));
    await program.methods.startTournament(system_prompt_hash, new anchor.BN(entry_sum)).accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    const tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    assert.equal(tournamentAccount.entryFee, entry_sum*0.01);
    const balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance - init_balance, entry_sum);
  });

  it("Submits to the second tournament", async () => {
    let tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    let entry_fee = tournamentAccount.entryFee;
    let solution_hash = Array.from(new Uint8Array(32).fill(3));
    await program.methods.submitSolution(solution_hash).accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    const expected_fee1 = entry_fee.add(entry_fee.muln(1).divn(100));
    assert.equal(tournamentAccount.entryFee.toString(), expected_fee1.toString());
    let balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance - init_balance, entry_sum + entry_fee.toNumber());

    tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    let entry_fee2 = tournamentAccount.entryFee;
    solution_hash = Array.from(new Uint8Array(32).fill(4));
    await program.methods.submitSolution(solution_hash).accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    tournamentAccount = await program.account.tournament.fetch(tournamentPubKey);
    const expected_fee2 = entry_fee2.add(entry_fee2.muln(1).divn(100));
    assert.equal(tournamentAccount.entryFee.toString(), expected_fee2.toString());
    balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance - init_balance, entry_sum + entry_fee2.toNumber() + entry_fee.toNumber());
  });
  
  it("Concludes a second tournament", async () => {
    await program.methods.concludeTournament().accountsStrict({
      tournament: tournamentPubKey,
      payer: provider.wallet.publicKey, 
      winnerAccount: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();
    let balance = await provider.connection.getBalance(tournamentPubKey);
    assert.equal(balance, init_balance);
  });
});
