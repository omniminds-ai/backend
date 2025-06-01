"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const assert = require("assert");
describe("tournament", () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Tournament;
    const init_seed = anchor.utils.bytes.utf8.encode("tournament");
    const entry_sum = 100000000000;
    let init_balance = 0;
    let tournamentPubKey;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        [tournamentPubKey] = yield anchor.web3.PublicKey.findProgramAddressSync([init_seed], program.programId);
    }));
    it("runs the constructor", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods.initialize().accountsStrict({
            tournament: tournamentPubKey,
            authority: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        })
            .rpc();
        const tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        assert.equal(tournamentAccount.authority, provider.wallet.publicKey.toString());
        init_balance = yield provider.connection.getBalance(tournamentPubKey);
    }));
    it("Starts a tournament", () => __awaiter(void 0, void 0, void 0, function* () {
        const expected_entry_fee = entry_sum / 100;
        const system_prompt_hash = Array.from(new Uint8Array(32).fill(0));
        yield program.methods.startTournament(system_prompt_hash, new anchor.BN(entry_sum)).accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        const tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        assert.equal(tournamentAccount.entryFee, expected_entry_fee);
        const balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance - init_balance, entry_sum);
    }));
    it("Submits some solutions", () => __awaiter(void 0, void 0, void 0, function* () {
        let tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        const entry_fee = tournamentAccount.entryFee;
        const solution_hash = Array.from(new Uint8Array(32).fill(1));
        yield program.methods.submitSolution(solution_hash).accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        // Match Rust's calculation: fee + fee * 1/100
        const expected_fee = entry_fee.add(entry_fee.muln(1).divn(100));
        assert.equal(tournamentAccount.entryFee.toString(), expected_fee.toString());
        const balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance - init_balance, entry_sum + entry_fee.toNumber());
    }));
    it("Concludes a tournament", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods.concludeTournament().accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            winnerAccount: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        let balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance, init_balance);
    }));
    it("Starts a second tournament", () => __awaiter(void 0, void 0, void 0, function* () {
        let system_prompt_hash = Array.from(new Uint8Array(32).fill(2));
        yield program.methods.startTournament(system_prompt_hash, new anchor.BN(entry_sum)).accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        const tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        assert.equal(tournamentAccount.entryFee, entry_sum * 0.01);
        const balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance - init_balance, entry_sum);
    }));
    it("Submits to the second tournament", () => __awaiter(void 0, void 0, void 0, function* () {
        let tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        let entry_fee = tournamentAccount.entryFee;
        let solution_hash = Array.from(new Uint8Array(32).fill(3));
        yield program.methods.submitSolution(solution_hash).accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        const expected_fee1 = entry_fee.add(entry_fee.muln(1).divn(100));
        assert.equal(tournamentAccount.entryFee.toString(), expected_fee1.toString());
        let balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance - init_balance, entry_sum + entry_fee.toNumber());
        tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        let entry_fee2 = tournamentAccount.entryFee;
        solution_hash = Array.from(new Uint8Array(32).fill(4));
        yield program.methods.submitSolution(solution_hash).accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        tournamentAccount = yield program.account.tournament.fetch(tournamentPubKey);
        const expected_fee2 = entry_fee2.add(entry_fee2.muln(1).divn(100));
        assert.equal(tournamentAccount.entryFee.toString(), expected_fee2.toString());
        balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance - init_balance, entry_sum + entry_fee2.toNumber() + entry_fee.toNumber());
    }));
    it("Concludes a second tournament", () => __awaiter(void 0, void 0, void 0, function* () {
        yield program.methods.concludeTournament().accountsStrict({
            tournament: tournamentPubKey,
            payer: provider.wallet.publicKey,
            winnerAccount: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
        }).rpc();
        let balance = yield provider.connection.getBalance(tournamentPubKey);
        assert.equal(balance, init_balance);
    }));
});
