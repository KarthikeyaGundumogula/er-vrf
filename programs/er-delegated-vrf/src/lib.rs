pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("ApfJgwefMJsMBE4PSypaxNjRM3uVQm7XKiY63gMvSauf");

#[ephemeral]
#[program]
pub mod er_delegated_vrf {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.handler(ctx.bumps)
    }

    pub fn send_req(ctx: Context<SendVrfReq>,client_seed:u8) -> Result<()> {
        ctx.accounts.send_req(client_seed)?;
        Ok(())
    }

    pub fn callback_res(ctx: Context<CallbackVrf>,randomness: [u8; 32]) -> Result<()> {
        ctx.accounts.callback(randomness)?;
        Ok(())
    }

    pub fn delegate(ctx: Context<DelegateInput>) -> Result<()> {
        ctx.accounts.delegate()?;
        Ok(())
    }

    pub fn un_delegate(ctx: Context<Undelegate>) -> Result<()> {
        ctx.accounts.undelegate()?;
        Ok(())
    }

    pub fn close_acc(ctx: Context<CloseUser>) -> Result<()> {
        ctx.accounts.close()?;
        Ok(())
    }
}
