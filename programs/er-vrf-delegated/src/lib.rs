use anchor_lang::prelude::*;

declare_id!("Dydacss7BXagAMpjqEj3wTUG58xXeoSW2koog92kfzPw");

#[program]
pub mod er_vrf_delegated {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
