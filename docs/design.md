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

## World & exploring (Milestone 3, built)
- 5 placeholder continents × 5 regions, each region with a danger level 1–10. Everyone starts in Green Bamboo Village.
- Travel takes time (test speed: 30s same continent, 3 min other continent); no exploring while travelling.
- Exploring costs stamina (100 max, regenerates over time). Outcomes: qi, herbs, spirit stones, beast fights (win/lose), nothing, chance encounters (pills, dew), very rare encounters (big qi, legendary fruit).
- Harder regions (danger above your realm) give more but beasts are more likely to beat you.
- Items: materials (for future crafting) and consumables. Pills give qi but add temporary toxicity; overflow past 100 turns half the excess into permanent toxicity. App warns before overflowing.
- Toxicity slows cultivation: temporary up to −50%, permanent up to −67%.

## Active cultivation & seclusion (agreed Oct 29 2026)
- No always-on qi.
- Active cultivation: tap Cultivate; it runs for 1 hour; tap again each hour to keep going. Players can fight, explore, chat etc. while it runs.
- Secluded cultivation: for when offline. Only in a town or (later) your sect. Choose 2, 4, 6 or 8 hours. Faster qi than active. Limit 8 hours of seclusion per day. Sects can upgrade to give seclusion bonuses.

## Later (not now)
- Personal upgrade trees (alongside sect trees): longer cultivation/seclusion time and bigger bonuses. Points earned per cultivation level, or rarely in Divine Realms.
- Stat allocation, inspired by a "Parameters" screen with sliders: points earned through actions, put into areas such as cultivation vs combat; saved builds; reset only with rare special items.
- Possible in-app purchase market if the game goes to Google Play / App Store.

## Notifications (built)
- Collapsible list at the top of the Cultivate tab with an unread badge. For things that happen TO the player (attacks, trade offers, sect events, seclusion finished) — not a log of their own upgrades.

## Sects (Milestone 4, built)
- Found a sect for 300 spirit stones; its home is the region you are standing in. Up to 30 members.
- Ranks: Sect Leader, Elder, Disciple. Leader: ranks, pass leadership, expel, alliances, give up land. Elders: accept requests, expel disciples, claim land.
- Join by request; leader/elders get notified and accept/decline.
- Treasury: members donate spirit stones. Claim the (non-town) region you stand in, paid from treasury (100 × danger). Max 3 regions for now.
- Controlled regions pay taxes into the treasury (10 × danger stones/hour). Members exploring their own territory have an 8% chance of a citizens' gift (stones or a pill).
- Seclusion allowed at the sect's home with a ×1.2 bonus.
- Alliances: leaders propose/accept/end. Map marks regions as yours (★), ally (◆), or another sect.
- Leader must pass leadership before leaving; last member leaving disbands the sect and frees its land.

## Region specialties & sect homes (built)
- Every claimable region has a specialty: spirit-stone vein (taxes ×2) or a crafting material.
- Material regions: anyone exploring there has a 20% bonus chance to find that material; the controlling sect gets 1 of it every 4 hours (test speed) into the sect storehouse. Leader/elders hand items out to members.
- New materials: Spirit Iron Ore, Spirit Jade, Flame Crystal, Thunder Stone, Ancient Spirit Wood (plus existing herbs, cores, Frost Lotus).
- Leader can move the sect home to the region they stand in: 200 treasury stones, once every 7 days. Any region works, even one another sect controls — homes and territory are separate.
- Many sects may share a home region for now; may need limits if the game gets crowded.
- Stronghold: if a sect controls its own home region, that region's taxes, tribute speed and citizens' gift chance are ×1.5.

## PvP (Milestone 5, built)
- "Look for opponents" lists up to 20 players in your region with sect marks (★ your sect, ◆ ally), odds (Easy → Deadly) and why they can't be attacked if blocked.
- Attacks: auto-resolved by realm, stage and root plus luck (each realm stage ≈ +1 rating; 3 rating points ≈ 73% win). Costs 15 stamina.
  - Protected: towns are safe zones; players in seclusion; players more than 1 realm below you; same target only once per 6 hours.
  - Winner (attacker or defender): +10% of stage qi instantly and +10% cultivation for 60 min.
  - Attacker who loses: −15% cultivation for 60 min. Defender who loses: −5% for 30 min. Defender always notified.
  - Same-sect and ally targets are allowed but flagged, with a stronger confirmation.
- Duels: challenge anyone in your region (towns allowed) with an optional spirit-stone bet; stake is held until they accept/decline (10 min expiry, refunded). Winner takes the pot. No growth effects.
- Boosts/penalties stack and only count while cultivating.
- TO DO: fights must also depend on skills, martial arts and magic arts (owner requirement) — battle_rating is the single place to add them.
- Later: chat, where players can arrange duels.

## Order of work
- Admin panel is built LAST, once every game system exists, so it covers everything.

## Stats & arts (owner design, Oct 29 2026)
- Arts are combat abilities that cost qi.
- Martial arts use physical stats; magic arts use mental stats.
- Physical defense: Constitution, Endurance.
- Mental defense: Willpower, Fortitude.
- Physical attack: Strength, Agility, Dexterity.
- Mental attack: Intelligence, Perception, Soul Power.
- Arts spend ENERGY (separate pool), not cultivation qi.

## Stat growth (owner design)
- Each stat's maximum is capped by cultivation stage (example: stage 1 max 100, stage 5 max 500 → max = 100 × overall stage number).
- Reaching a new stage gives some stat points automatically; higher stages give more.
- Rare items, when ingested, give points to a specific stat.
- Players can choose to TRAIN a stat instead of cultivating.
- Training speed depends on how close the stat is to its max: going 89→90 with max 100 is slow (90% of max); with max 500 it is quick (18% of max).
- Different arts use different stats as their multipliers.

## Cultivation styles
- Soul cultivation: the realm/stage progression (current qi system).
- Body cultivation: bonus to physical stats — raises their caps and how fast they grow from training.
- Mental cultivation: the same for mental stats.

## Skills vs arts
- Skills: natural body/mind techniques with no energy cost (punches, kicks, dodging, parrying...).
- Arts: combat abilities that cost energy; martial (physical stats) or magic (mental stats).
- Both learned from manuals or masters.

## Proficiency tiers (skills and arts)
- Level 1–100: Early 1–25, Low 26–50, Mid 51–75, High 76–99, Peak 100.
- At the top of a tier you need a qualified trainer to break into the next tier.
- NPC masters: paid, teach only the lowest quality.
- Player masters (direct pupil): teach an art/skill starting 2 tiers below their own (High master → starts you at Low 26; Peak master → Mid 51, the highest possible start). Can help a pupil break through up to one tier below their own. Can also help the pupil's cultivation.
