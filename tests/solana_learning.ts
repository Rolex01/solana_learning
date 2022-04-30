import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { Donate } from "../target/types/donate";
import assert from "assert";
const { PublicKey, SystemProgram } = anchor.web3;


describe("donate", () => {
    anchor.setProvider(anchor.Provider.env());
    const program = anchor.workspace.Donate as Program<Donate>;
    const authority1 = anchor.web3.Keypair.generate();
    const authority2 = anchor.web3.Keypair.generate();
  
    it("Is initialized!", async () => {
        const [myAccountPDA, bumpPDA] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("program_donation"),
                anchor.getProvider().wallet.publicKey.toBuffer(),
            ],
            program.programId
        );

        const tx = await program.rpc.initialize({
            accounts: {
                myAccount: myAccountPDA,
                owner: anchor.getProvider().wallet.publicKey,
                systemProgram: SystemProgram.programId,
            },
        });
        console.log("Your transaction signature", tx);

        const account = await program.account.myAccount.fetch(myAccountPDA);

        assert.equal(account.owner.toString(), anchor.getProvider().wallet.publicKey.toString());
    });

    it("Is createProgramAddress!", async () => {
        const [userDonationPDA1, bumpPDA1] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("user_donation"),
                authority1.publicKey.toBuffer()
            ],
            program.programId
        );
        const [userDonationPDA2, bumpPDA2] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("user_donation"),
                authority2.publicKey.toBuffer()
            ],
            program.programId
        );
    
        await anchor.getProvider().connection.confirmTransaction(
          await anchor.getProvider().connection.requestAirdrop(authority1.publicKey, anchor.web3.LAMPORTS_PER_SOL * 10),
          "confirmed",
        );
        await anchor.getProvider().connection.confirmTransaction(
          await anchor.getProvider().connection.requestAirdrop(authority2.publicKey, anchor.web3.LAMPORTS_PER_SOL * 20),
          "confirmed",
        );

        await program.rpc.createProgramAddress({
            accounts: {
                userDonation: userDonationPDA1,
                owner: anchor.getProvider().wallet.publicKey,
                user: authority1.publicKey,
                systemProgram: SystemProgram.programId,
            },
        });

        await program.rpc.createProgramAddress({
            accounts: {
                userDonation: userDonationPDA2,
                owner: anchor.getProvider().wallet.publicKey,
                user: authority2.publicKey,
                systemProgram: SystemProgram.programId,
            },
        });

        const accounts = await program.account.userDonation.all();

        accounts.forEach(function (acc) {
            assert.equal(acc.account.total, 0);
        });
    });

    it("payin", async () => {
        const [my_account, _] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("program_donation"),
                anchor.getProvider().wallet.publicKey.toBuffer(),
            ],
            program.programId
        );
        const [userDonationPDA1, bumpPDA1] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("user_donation"),
                authority1.publicKey.toBuffer()
            ],
            program.programId
        );
        const [userDonationPDA2, bumpPDA2] = await PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("user_donation"),
                authority2.publicKey.toBuffer()
            ],
            program.programId
        );
        const rent_my_account = await program.provider.connection.getMinimumBalanceForRentExemption(40);
        
        await program.rpc.payin(
            new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
            {
                accounts: {
                    donor: authority1.publicKey,
                    myAccount: my_account,
                    userDonation: userDonationPDA1,
                    systemProgram: SystemProgram.programId,
                },
                signers: [authority1],
            },
        );

        await program.rpc.payin(
            new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 2),
            {
                accounts: {
                    donor: authority2.publicKey,
                    myAccount: my_account,
                    userDonation: userDonationPDA2,
                    systemProgram: SystemProgram.programId,
                },
                signers: [authority2],
            },
        );

        assert.equal((await program.account.userDonation.fetch(userDonationPDA1)).total.toString(), (new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 1)).toString());
        assert.equal((await program.account.userDonation.fetch(userDonationPDA2)).total.toString(), (new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 2)).toString());

        assert.equal(await program.provider.connection.getBalance(authority1.publicKey), new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 9));
        assert.equal(await program.provider.connection.getBalance(authority2.publicKey), new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 18));
        assert.equal((await program.provider.connection.getBalance(my_account)), new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 3 + rent_my_account));
    });

    it("withdraw", async () => {
        const [my_account, bump] = await anchor.web3.PublicKey.findProgramAddress(
            [
                anchor.utils.bytes.utf8.encode("program_donation"),
                anchor.getProvider().wallet.publicKey.toBuffer(),
            ],
            program.programId
        )

        const rent_my_account = await program.provider.connection.getMinimumBalanceForRentExemption(40);

        const tx = await program.rpc.withdraw(
            new anchor.BN(anchor.web3.LAMPORTS_PER_SOL),
            {
                accounts: {
                    myAccount: my_account,
                    owner: anchor.getProvider().wallet.publicKey,
                },
            },
        );

        assert.equal((await program.provider.connection.getBalance(my_account)), new anchor.BN(anchor.web3.LAMPORTS_PER_SOL * 2 + rent_my_account));
    });

    it("show all userDonation and amount total", async () => {
        const accounts = await program.account.userDonation.all();
        console.log("usersDonation:");
        accounts.forEach(function (acc) {
            console.log("pubKey: " + acc.publicKey.toString() + "; amount total: " + acc.account.total.toString());
        });
    });
});
