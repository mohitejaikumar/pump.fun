use anchor_lang::{
    prelude::*,
    solana_program::{
        program::{invoke, invoke_signed},
        system_instruction::transfer,
    },
};

use anchor_spl::token;

pub fn sol_transfer_from_user<'info>(
    signer: &Signer<'info>,
    destination: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let tx = transfer(signer.key, destination.key, amount);
    invoke(
        &tx,
        &[
            signer.to_account_info(),
            destination.to_account_info(),
            system_program.to_account_info(),
        ],
    )?;
    Ok(())
}

pub fn sol_transfer_with_signer<'info>(
    source: &AccountInfo<'info>,
    destination: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    // save cu
    // source.sub_lamports(amount)?;
    // destination.add_lamports(amount)?;

    let ix = transfer(source.key, destination.key, amount);
    invoke_signed(
        &ix,
        &[
            source.to_account_info(),
            destination.to_account_info(),
            system_program.to_account_info(),
        ],
        signer_seeds,
    )?;
    Ok(())
}

pub fn token_transfer_user<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let cpi_ctx = CpiContext::new(
        token_program.to_account_info(),
        token::Transfer {
            from: from.to_account_info(),
            authority: authority.to_account_info(),
            to: to.to_account_info(),
        },
    );
    token::transfer(cpi_ctx, amount)?;

    Ok(())
}

pub fn token_transfer_with_signer<'info>(
    from: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_ctx: CpiContext<_> = CpiContext::new_with_signer(
        token_program.to_account_info(),
        token::Transfer {
            from: from.to_account_info(),
            authority: authority.to_account_info(),
            to: to.to_account_info(),
        },
        signer_seeds,
    );

    token::transfer(cpi_ctx, amount)?;

    Ok(())
}
