use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::delegate;
use ephemeral_rollups_sdk::cpi::DelegateConfig;

use crate::UserAccount;

#[delegate]
#[derive(Accounts)]
pub struct DelegateInput<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK The pda to delegate
    #[account(mut, del, seeds = [b"user-acc", user.key().as_ref()], bump)]
    pub user_acc: Account<'info, UserAccount>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub validator: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> DelegateInput<'info> {
    pub fn delegate(self: &mut Self) -> Result<()> {
        self.delegate_user_acc(
            &self.user,
            &[b"user-acc", self.user.key().as_ref()],
            DelegateConfig {
                validator: Some(self.validator.key()),
                ..Default::default()
            },
        )?;
        Ok(())
    }
}
