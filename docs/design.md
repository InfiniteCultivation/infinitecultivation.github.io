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
