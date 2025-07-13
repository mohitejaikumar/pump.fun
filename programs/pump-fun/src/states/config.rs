use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct ConfigSettings {
    // New struct for the instruction argument
    pub authority: Pubkey,
    // team wallet address
    pub fee_recipient: Pubkey,
    // limit for bonding curve
    pub curve_limit: u64,

    // curve token/sol amount config
    pub initial_virtual_token_reserve: u64,
    pub initial_virtual_sol_reserve: u64,
    pub initial_real_token_reserve: u64,
    pub total_token_supply: u64,

    // platform fee percentage
    pub buy_fee_percentage: f64,
    pub sell_fee_percentage: f64,
    pub migration_fee_percentage: f64,

    pub reserved: [[u8; 8]; 8],
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    // team wallet address
    pub fee_recipient: Pubkey,
    // limit for bonding curve
    pub curve_limit: u64,

    // curve token/sol amount config
    pub initial_virtual_token_reserve: u64,
    pub initial_virtual_sol_reserve: u64,
    pub initial_real_token_reserve: u64,
    pub total_token_supply: u64,

    // platform fee percentage
    pub buy_fee_percentage: f64,
    pub sell_fee_percentage: f64,
    pub migration_fee_percentage: f64,

    pub reserved: [[u8; 8]; 8],
}

impl Config {
    pub const SEED_PREFIX: &'static str = "global_config";
    pub const LEN: usize = 32 + (32 * 5) + 32 + 8 + (8 * 4) + (8 * 3) + 64;
}
