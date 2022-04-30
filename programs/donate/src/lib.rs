use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const DISCRIMINATOR_LENGTH: usize = 8;

const PROGRAM_PDA_SEED: &[u8] = b"program_donation";
const DONATION_PDA_SEED: &[u8] = b"user_donation";

#[program]
mod donate {
    use anchor_lang::solana_program::{
        program::{invoke},
        system_instruction::{transfer}
    };

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        my_account.owner = *ctx.accounts.owner.key;
        Ok(())
    }

    pub fn create_program_address(ctx: Context<CreateUserDonation>) -> Result<()> {
        let user_donation = &mut ctx.accounts.user_donation;
        user_donation.total = 0;

        Ok(())
    }

    pub fn payin(ctx: Context<Payin>, lamports: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;
        let donor = &mut ctx.accounts.donor;
        let user_donation = &mut ctx.accounts.user_donation;
        let transfer_instruction = &transfer(
            &donor.key(),
            &my_account.key(),
            lamports,
        );

        let result = invoke(
            transfer_instruction,
            &[
                donor.to_account_info(),
                my_account.to_account_info(),
            ]
        );

        user_donation.total += lamports;

        result.map_err(Into::into)
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        let my_account = &mut ctx.accounts.my_account;

        **my_account.to_account_info().try_borrow_mut_lamports()? -= lamports;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += lamports;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
    init,
    payer = owner,
    space = DISCRIMINATOR_LENGTH + std::mem::size_of::<MyAccount>(),
    seeds = [PROGRAM_PDA_SEED, owner.key().as_ref()],
    bump
    )]
    pub my_account: Account<'info, MyAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateUserDonation<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    /// CHECK:` field for .key.as_ref()
    pub user: UncheckedAccount<'info>,
    #[account(
    init,
    payer = owner,
    space = DISCRIMINATOR_LENGTH + std::mem::size_of::<UserDonation>(),
    seeds = [DONATION_PDA_SEED, user.key.as_ref()],
    bump
    )]
    pub user_donation: Account<'info, UserDonation>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Payin<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,
    #[account(mut)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub user_donation: Account<'info, UserDonation>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, has_one = owner)]
    pub my_account: Account<'info, MyAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[account]
pub struct MyAccount {
    owner: Pubkey,
}

#[account]
pub struct UserDonation {
    total: u64,
}
