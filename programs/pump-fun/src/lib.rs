use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;
pub mod utils;

use crate::instructions::*;
use crate::states::*;

declare_id!("6dM4UGjsZBMUcJxmRFJiF8z7g6UrVFMGqyUdzMXeG2Dg");

#[program]
pub mod pump_fun {

    use super::*;

    pub fn configure(ctx: Context<Configure>, new_config: ConfigSettings) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
