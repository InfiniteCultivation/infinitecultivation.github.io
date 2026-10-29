# Design notes

Decisions agreed with the owner, to build into later milestones.

## Spirit roots
- Rolled once on the server at character creation; permanent.
- Basic elements: Wood, Fire, Earth, Metal, Water. (No light/darkness/void.)
- Divine elements (Mutant root, 2%), each a combination of two basics: Lightning = Fire + Metal, Ice = Water + Earth, Nature = Wood + Water. More pairs may be added later.
- A divine element has its own path and perks, AND gets a portion of both parent elements' abilities.
- Grades: Mutant (1 divine element), Heavenly (1 element), Earth (2), Human (3), Mixed (4–5).
- Purer root = faster cultivation (current multipliers: Mutant 2.2, Heavenly 2.0, Earth 1.5, Human 1.2, Mixed 1.0/0.8).

## Professions / crafting (not built yet)
- Each element ties to crafts (proposal: Fire → alchemy, Metal → forging, Wood → herbalism, Water → healing, Earth → formations; rare elements → unique paths).
- A purer root is far better at its element's craft: a single Fire root can become amazing at alchemy; a 3-element Human root with Fire is only OK at it.
- Less pure roots: grow slower in the craft AND hit a lower maximum craft level.
- More elements = more crafts available (versatility), but each one weaker.

## Cultivation (Milestone 2)
- Qi gathers automatically on the server, even while the app is closed, at a rate based on realm and root multiplier.
- Qi stops at the amount the current stage needs (bottleneck) — players must come back to advance.
- Stages 1–9: advancing always succeeds. Stage 10 → next realm is a major breakthrough with a success chance (90% at realm 1, −6% per realm, min 30%); failure scatters half the qi.
- Balance numbers are placeholders: qi_needed = 100 × 1.35^(stage index); rate = 1.35^((realm−1)×10) ÷ 1.5^(realm−1) × root multiplier qi/sec.

## World (not built yet)
- 5 continents, each split into regions.
- Regions are controlled by sects. If a player's sect controls a region, members get benefits: taxes, and rare gifts from citizens.
- Players can travel between continents and regions.
- Mystic Realms: secret areas the admin can open inside a continent. They are an upgraded form of Divine Realms.

## PvP (not built yet)
- "Look for opponents" finds players in your current region to fight.
- Results mark players who are in your sect or allied sects, so you know before you attack.

## Growth pacing and boosts (agreed Oct 29 2026, not built yet)
- Passive qi should be much slower than the test speed; reaching the peak should be long-term, so players grow through actions, items and encounters.
- Winning a fight: instant qi bonus + a small % cultivation-speed boost for a while.
- Losing a fight you started (attacker): penalty to cultivation speed over time.
- Losing when someone else attacked you (defender): smaller penalty.
- Items (pills etc.): instant/timed bonus, but build up Toxicity in the body.
  - Toxicity is hard to remove and clears slowly on its own.
  - Can be reduced, or its clearing sped up, by chance encounters, extremely rare items, or an elder helping you.
- Mentors: a mentor trains you; the boost and temporary bonus depend on the mentor's abilities.
- Bonuses stack.

## Pacing target (agreed Oct 29 2026)
- Absolute best case (best low-toxicity items, very high-level elder, constant fighting vs players/NPCs): about 2 weeks to the peak. Everyone else takes longer.

## Things to do besides fighting
- Train skills: martial arts and magic arts.
- Crafting (see professions).
- Player-run tournaments: the creator picks 3 items from their own inventory as 1st/2nd/3rd prizes; players enter in-game; the game tracks the bracket and automatically gives the items to the winners.

## Cultivation ceiling
- Too much toxicity, or too weak a spirit root, can stop a character before the peak. The game tells them they have reached their limit.
- Endgame roles at the limit: mentor lower-realm sect members, fight in tournaments and defend sect resources in sect wars, or hone a craft.

## Toxicity — two bars (agreed Oct 29 2026)
- Temporary toxicity: from light item use; fades over time; only slows cultivation speed.
- Permanent toxicity: from going too far (overflowing temporary); does not fade; extremely hard to remove; lowers the cultivation ceiling.

## Placeholders
- Owner is fine with placeholder names for anything; they will rename what they don't like.

## Root upgrades (agreed Oct 29 2026, not built yet)
- Spirit roots can be upgraded through extremely rare items or encounters.
- A lucky player might upgrade once; it must not be possible to keep climbing all the way to Mutant.
