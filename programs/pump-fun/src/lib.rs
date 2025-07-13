use anchor_lang::prelude::*;

pub mod constants;
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
        ctx.accounts.process(new_config)
    }

    pub fn launch(ctx: Context<Launch>, name: String, symbol: String, uri: String) -> Result<()> {
        ctx.accounts
            .process(name, symbol, uri, ctx.bumps.global_config)
    }

    pub fn swap(ctx: Context<Swap>, amount: u64, direction: u8, min_out: u64) -> Result<()> {
        ctx.accounts
            .process(amount, direction, min_out, ctx.bumps.bonding_curve)
    }

    pub fn migrate(ctx: Context<Migrate>) -> Result<()> {
        Migrate::process(ctx)
    }
}
