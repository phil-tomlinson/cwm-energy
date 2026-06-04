# Quarterly Rebate Research Prompt

Run this every 3 months to refresh `src/data/rebatePrograms.js`.

## How to run

Open Claude Code (or any Claude session with web search) and paste the prompt below.
Compare the returned JSON against the current data file and update any programs that
have changed status, amounts, or deadlines. Add new programs. Move closed programs to
the `closedPrograms` array. Update `LAST_VERIFIED` at the top of the file.

Then commit: `git commit -m "Refresh Alberta rebate data — YYYY-MM"`

## Research prompt

> Search for all currently available residential home energy efficiency rebate, loan,
> and grant programs applicable to Alberta homeowners. The research scope is:
>
> 1. **Federal programs open to Alberta residents** — check Natural Resources Canada
>    (nrcan.gc.ca), CMHC (cmhc-schl.gc.ca), and Canada.ca for any active programs.
>    Specifically check: Canada Greener Homes Affordability Program (has Alberta signed
>    a delivery agreement yet?), Oil to Heat Pump Affordability Program (is it still
>    open and is Alberta still receiving only the $10K federal amount?), any new federal
>    programs announced since [LAST_VERIFIED].
>
> 2. **Alberta provincial programs** — check alberta.ca and efficiencyalberta.ca for
>    any active province-wide efficiency rebate or grant programs. Confirm SHARP loan
>    and grant are still open, and check the interest rate (reviewed April/October).
>
> 3. **Municipal programs** — check Calgary, Edmonton, and ceip.abmunis.ca for CEIP
>    intake status and dates. Check Banff solar rebate, Medicine Hat HAT Smart (new
>    program year?), Edmonton Change Homes for Climate solar.
>
> 4. **Home Upgrades Program (homeupgradesprogram.ca)** — confirm still open and
>    check for any changes to income thresholds or participating cities.
>
> For each program, confirm or update:
> - Current status (open / closed / uncertain)
> - Maximum rebate/loan amount
> - Key eligibility criteria and income thresholds
> - Application deadline or program end date
> - Whether a pre-retrofit EnerGuide audit is required
> - Stackability with other programs
>
> Return changes as a diff against the previous data — list: programs with changed
> status, programs with changed amounts or deadlines, new programs found, and any
> programs confirmed closed since last check.

## Checklist after updating

- [ ] `LAST_VERIFIED` date updated in `rebatePrograms.js`
- [ ] All programs with `status: 'open'` confirmed still open
- [ ] All programs with `status: 'uncertain'` re-evaluated
- [ ] Any newly closed programs moved to `closedPrograms` array with `closedDate`
- [ ] New programs added with all required fields
- [ ] `statusNote` fields updated with latest information
- [ ] `docs/rebate-research-prompt.md` LAST_VERIFIED reference updated
- [ ] Commit message includes month: `Refresh Alberta rebate data — YYYY-MM`
