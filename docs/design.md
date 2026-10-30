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
- Passive target (owner, Oct 29 evening): the WORST root (Mixed ×0.8), cultivating nonstop with full daily seclusion and no fighting, reaches the peak in about 30 days. Applied: qi_rate × 0.2165. Average Mixed ×1.0 ≈ 24 days, Human ×1.2 ≈ 20, Earth ×1.5 ≈ 16, Heavenly ×2.0 ≈ 12, Mutant ×2.2 ≈ 11. Players should not wait longer than that to be able to reincarnate (reincarnation: design pending).
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

## Layout (owner request)
- Hub style like the owner's reference game: Home shows cultivation progress and key numbers, with big buttons into each section.
- Character screen: overview of the character, with buttons into Stats, Skills, Arts, Cultivation Styles (placeholders until built).
- World: region + Explore, with buttons into Travel and Cultivators nearby.
- Bottom bar: Home, Character, World, Sect, Bag.

## Layout v2, chat, messages, trade (built)
- Home: only name, realm/stage, qi bar and one Cultivate button (becomes "Advance ›" to Character when qi is full). Hub: Character, Explore, Trade, Nearby, Sect, Bag. Notifications below.
- Character: full cultivation details (session, seclusion, Advance), spirit stones/stamina/location, root, toxicity, effects. Hub: Stats, Skills, Arts, Cultivation Styles, Upgrade (coming soon), Messages.
- Bottom bar: Home, Character, World, Chat, Sect Chat.
- Chat: Region / Continent / Global channels (based on where you are); remembers last channel. Sect Chat is private to the sect. 2-second rate limit, 300 characters.
- Messages: direct messages to any character by name; unread badges.
- Trade: auction house only (no direct trading, to stop alt-account feeding). 24-hour auctions, highest bid wins, each bid ≥5% higher, bids held in escrow and refunded when outbid, 5% fee on sales, up to 10 listings, cancel only before any bids.
- Items have a minimum realm to use. Sect storehouse: one item per person per day, only to members strong enough to use it.

## Stats & training (Step 6, built — defaults chosen, owner may change)
- 10 stats, all start at 10. Cap = 100 × overall stage number × (1 + body or mental cultivation level / 100).
- Free points per new stage: 5 + half the stage number (realm breakthrough +10 more). Spent on the Stats screen (+1 / +5), never above cap.
- Training: tap Train on a stat → 1 hour. Replaces cultivating (no qi while training); cultivating or entering seclusion ends it; not allowed in seclusion.
  Growth follows cap − (cap − value) × e^(−20 × (1 + level/100) × hours / cap): fast far from the cap, very slow near it.
- Body cultivation level (0–100) rises 0.5 per hour of physical training; Mental level the same for mental stats.
- Stats do not affect fights yet — that comes with skills, arts and the new combat (next step).

## Combat loadout (owner design, Oct 29 2026)
- Attack: 1 PRIMARY attack skill (the idle attack) + 3 attack UTILITY skills that empower it (multi-hit that grows 2→3→4 hits with level, add an element the opponent may be weak to, etc.).
- Defense: 1 PRIMARY defense skill + 3 defense UTILITY skills (dodge, parry, turn a block into a weak counter, etc.).
- 3 PASSIVE skills (faster energy regen, tiny chance to recover health; higher tiers e.g. life leech).
- PROFESSION skills, always tied to the profession; some used outside combat (gatherer: Search based on Perception, multi-gather chance based on Dexterity; swordsman: sword mastery bonus when wielding a sword, bleed damage).
- Arts: up to 6 equipped, cost energy.
- Everyone starts with a basic kit.
- Manuals: very rarely found exploring; lowest-quality manuals sold in towns; upgraded sects with a store get better manuals rotating in from traveling merchants.
- Derived pools should mix physical and mental stats so players can't min-max easily (owner suggested Stamina from Constitution + Willpower).

## Step 7a: skills, pools, market, healer (built)
- Decisions (owner said "however you like"): arts auto-fire in slot order when energy allows; all fights idle for now (live turn choice later); professions later with crafting.
- 34 skills: 4 primary attacks, 12 attack utilities (incl. 5 elemental infusions), 3 primary defenses, 10 defense utilities (incl. 5 elemental wards), 8 passives (Life Leech, Iron Will need realm 3).
- Loadout: attack + 3 utilities, defense + 3 utilities, 3 passives. Starting kit: Basic Punch + Basic Guard.
- Effects scale with level: 0.5× at level 1, 1× at 50, 1.5× at 100.
- Proficiency 1–100 with tier caps 25/50/75/99/100. Practice like training (1h taps). Town trainer: Early→Low for 250 stones; higher tiers need a master (not built yet).
- Manuals are items; read from the Bag to learn the skill. Town markets sell Early manuals (150–300 stones). ~1–3% chance per explore to find a random manual.
- HP = 10 × (Con + Fort); Energy = 5 × (Soul + Endu); Stamina max = 100 + (Con + Wil − 20)/4. HP regenerates 3%/h; energy 30%/h.
- Below 25% HP you are too injured to explore. Town healers restore full HP over 5 minutes for 0.2 stones per missing HP.

## Turn-based combat (owner design, Oct 29 2026)
- Each turn: auto exchange (primary attack + utilities vs primary defense + utilities), then the active player plays ONE art (costs energy) or skips/meditates (regains extra energy). Energy also regenerates a little each turn.
- The defender may respond with a reaction/counter art by spending energy. Then the other player's turn. Inspired by Magic: The Gathering / Yu-Gi-Oh, with arts as the cards.
- Auto mode: arts go in the player's set order when there is enough energy; if not enough energy, the turn is skipped to regenerate. Players set up their arts in Character for when they are attacked via Look for opponents (used automatically when defending).
- Items in combat: combat classes can use items (healing pills, energy pills) but it uses their turn's action.
- Crafting classes (e.g. alchemist) have class skills/arts that combine with inventory items: using an Early-quality item does NOT consume it (fair vs combat classes' unlimited arts); higher-rarity items have a rapidly increasing chance to be consumed. An alchemist art can attack AND use an item (below a quality limit) in the same turn.
- Gatherer-type classes can set traps on their turn that help counter attacks.
- All classes can also learn general combat arts not tied to a class.
- Owner confirmed (Oct 29): when a beast attacks (exploring or a hunt) the player chooses manual or auto; 30-second turns, auto picks when time runs out; types Strike / Technique / Reaction / Ultimate; ultimates must build up over turns (not usable at the start); element Resonance only builds for yourself; elemental arts hit harder against the target's root (a guessing game unless you know their element); attackers can flee (still a loss with the penalty, but they keep their remaining HP); defeated in the wild = wake in the nearest town with 1 HP; arts cost more energy as they level up (energy pools also grow).

## Step 7b: turn-based battles (built)
- Battle state lives in a `battles` row (jsonb state machine): turn start (energy +6%, cooldowns/buffs tick, bleeding, stun, auto exchange) → action (art, meditate +20% energy, pill, flee) → reaction (defender's hidden reaction arts; one per action) → next turn. 15 rounds max, then decided by HP %.
- Ultimates have their own slot (slot 7), separate from the six arts. They charge 1 per own turn and need their own number of turns (Heaven-Shattering Fist 5, Nine Suns Inferno 4); cost 50 energy; charge resets on use. In battle they show as a charge bar under the arts. Autopilot fires a charged ultimate first and saves energy for it.
- Cooldown N = unusable for your next N turns. Art energy = base × (1 + (level−1)/99) → double at level 100. Art damage also grows with level.
- Resonance: using an art of one of your own root elements adds +10% to your art damage (max 5 stacks).
- Missed deadlines are filled in by the autopilot whenever either player (or the server) next looks at the battle, so abandoned fights still finish.
- Rewards: beasts give qi, stones and loot (Hunt ×1.5, costs 2× explore stamina, not in towns). Losing to a beast: −5% qi, wake in the continent's town at 1 HP. Attacks: old win/lose effects; HP carries over for both; KO'd loser wakes in town; defender always fights on autopilot with their saved order. Duels: both start full, no lasting injury, winner takes the pot.
- Pills used in battle are consumed afterwards; each art use +0.5 proficiency; primary attack/defense skills +0.25 per fight.
- Settings (Character › Arts): beasts = Ask me / Always auto; attacks I start = I choose / Auto.
- Not yet: alchemist item arts, gatherer traps, class arts, NPC cultivators.

## Classes & professions (owner design, Oct 29 2026)
- Everyone has ONE combat class and ONE profession, so nobody is a pure non-combatant who gets steamrolled. Six art slots can mix general, class and profession arts.
- Combat classes (owner's list): martial — Swordsman, Pugilist, Spearman; magical — Spiritualist, Elementalist (chooses a primary element); plus support classes.
- Professions are for outside combat: gathering, mining and crafting of all sorts — armor, weapons, pills, talismans and arrays.

## Step 8: professions v1 (built)
- Gatherer and Alchemist so far. First choice free; changing costs 500 stones and restarts at level 1. Level 1–100 with tier caps; the town trainer breaks Early → Low for 250 stones; higher tiers need a master.
- Spirit root sets affinity and the highest tier reachable. Alchemy: pure Fire ×1.5 up to Peak; Fire in 2 elements ×1.2 up to High; Fire in 3+ ×1.0 up to Mid; no Fire ×0.7 up to Low. Gathering: Wood/Earth gives a similar but gentler scale.
- Gather: 10 stamina, not in towns. Region specialty or common materials; Search (Perception + level) finds the region's rare material; Multi-gather (Dexterity + level) finds extra.
- Alchemy recipes: Energy, Healing, Qi Gathering (level 10), Purifying Dew (level 30), Spirit Condensing (level 40). They cost energy; failure loses the ingredients; great success doubles the output.
- Class arts (sold in town markets, class-locked): Hidden Snare (Gatherer trap: the next enemy art that lands springs it, with a damage and stun chance), Pill-Infused Palm (Alchemist: strike and draw on a battle pill at 60% strength; common pills not used up), Venom Pill Mist (Alchemist poison). Alchemists get +30% from battle pills.
- To do later: Miner (or fold into Gatherer), Blacksmith (weapons/armor), Talisman maker, Array master; equipment slots.

## Step 9: combat classes v1 (built)
- Owner picked: Swordsman, Body Cultivator, Spellcaster (chooses a primary element — owner's Elementalist idea), Soul Cultivator. Support classes later.
- First choice free; changing costs 500 stones and restarts at level 1 (a Spellcaster switching element keeps their level). Class level rises with every fight (+1 for a win, +0.5 otherwise, slowing near the tier cap); the town trainer breaks Early → Low.
- Passive bonuses scale with class level (×0.5 at level 1 → ×1.5 at 100): Swordsman crit +5%, bleed +10%; Body +10% battle HP, 5% leech, 20% stun resist; Spellcaster primary-element arts +20% damage and always build Resonance; Soul +15% battle energy, 15% mental resist, +30% energy regen.
- Class arts (class-locked, 400 stones in markets): Crescent Moon Slash, Flowing Riposte (Swordsman); Iron Mountain Charge, Vajra Body (Body); Elemental Bolt (takes the primary element), Surging Tide of Qi (Spellcaster); Soul Lash, Mind Shackle (Soul). Class arts get +level/2 % damage.

## Step 10: equipment + Blacksmith (built)
- Two gear slots: weapon and armor. Gear is a normal stackable item (tradeable at auction); equipping takes it out of the bag, unequipping returns it.
- Grades: Iron (common, sold in towns: weapons 150, armor 200), Jade (uncommon, forge level 15), Flamesteel (rare, 35), Thunderforged (epic, 60). Weapon damage +8/15/25/40%; armor blunts 5/10/15/25% of damage and adds 5/10/15/20% battle health.
- Weapon types match classes: Sword (Swordsman), Gauntlets (Body Cultivator), Staff (Spellcaster), Soul Bell (Soul Cultivator). A matching weapon gives 25% more bonus. Any class may use any weapon.
- Blacksmith profession: Metal root affinity (pure Metal ×1.5 up to Peak … no Metal ×0.7 up to Low). Forges all 20 gear pieces; costs energy; failure ruins the materials. Class art: Sundering Blow (Metal strike that stacks −15% defense, up to −45%).
- Battle-only bonus health/energy never carries back out of a fight.

## Step 11: Talisman Master + Array Master (built)
- Talisman Master (Water affinity): Guarding (20% shield), Flame (12% of enemy health, Fire), Binding (60% stun), Thunder (25% + stun chance, Metal). Talismans are battle-only items used as your action. Class art: Thousand Paper Blades (3-hit Water strike).
- Array Master (Earth affinity): Spirit Gathering Array Flag (+15% cultivation 4h), Grand Qi Cyclone Array Disk (+30% 4h). Used from the Bag. Class art: Earthbound Array (weaken + defense).
- Any item marked "battle" can now be used in fights (pills and talismans); the battle shows every one you carry.
- Mining is part of Gatherer for now (ore comes from gathering).

## Step 12: Cultivation Styles screen + Upgrades (built)
- Styles screen explains Soul (realm/stage), Body and Mental cultivation, with current levels and links to cultivate/train.
- Upgrade points: one per stage advanced (stage index − 1). Rank N of a node costs N points; 5 ranks each; permanent (reset items later).
- Nodes: Flowing Meridians (+3% cultivation speed per rank, shown as a permanent effect), Iron Constitution (+5% max health), Boundless Sea of Qi (+5% max energy), Endless Vigor (+5 max stamina).
- Later: longer seclusion / cultivation sessions, sect trees, Divine Realm point sources.

## Step 13: masters & pupils, NPC trainers (built)
- Tiers: Early 1–25, Low 26–50, Mid 51–75, High 76–99, Peak 100 (caps 25/50/75/99/100) for skills, arts, class and profession.
- NPC trainers: any town trainer does Early → Low (250 stones); the Grand Elder in the Imperial Capital does Low → Mid (2,000). Beyond Mid only player masters. Arts now have breakthroughs too.
- Player masters (World › Cultivators nearby › Seek guidance; both in the same region): a master can break a pupil through a tier if the master's own tier is at least two above the pupil's current tier (High master → pupil Low→Mid). A master with a skill/art at Mid or higher can teach it; the pupil starts two tiers below the master. Class/profession arts can only be taught to that class/profession.
- The pupil offers a fee, held until the master answers (returned on decline/cancel/expiry after 24h). Requests show in World › Masters & pupils and as notifications.
- Peak cannot be reached through masters (reserved for special events/realms).

## Step 14: NPC wandering cultivators (built)
- 69 NPCs (3 per wild region: friendly, neutral, hostile) with a title, class, root, realm near the region's danger, and a purse of stones.
- Each game day an NPC may drift to a nearby region on the same continent (danger within 2), sometimes gains a stage, and their purse refills a little.
- Shown in World › Cultivators nearby. Friendly/neutral: Talk once per day (rumours; friendly ones sometimes gift stones or an item). Anyone can be attacked (15 stamina). Hostile ones may ambush you while exploring (30% of encounters in their region).
- NPCs fight with their class's arts on autopilot. Beat one: +10% stage qi and half their purse; they recover for 3 hours. Lose: −5% qi, they take 5% of your stones, you wake in town.
- Later: NPC sects, NPC masters, admin-triggered events.

## Step 15: NPC sects (built)
- Owner rule: NPCs only ever attack you while you are exploring.
- Five NPC sects, one per continent: Azure Cloud Sword Pavilion (righteous), Hundred Flowers Valley (neutral), Blood Sand Sect (demonic), Frost Moon Palace (neutral), Nine Nether Cult (demonic). Each holds its continent's two most dangerous unclaimed regions.
- Each NPC region has a guardian (an Elder, realm = danger + 1, tougher than normal NPCs) who never wanders. Wanderers in NPC land became that sect's disciples: friendly for righteous sects, hostile for demonic ones; they stay home.
- Player sects can't claim NPC land directly. A sect leader or elder challenges the guardian (World › Cultivators nearby). Winning frees the region for 3 days; any sect may claim it in that window, otherwise the NPC sect's hold returns.
- Demonic territory: ambush chance while exploring is 50% of encounters instead of 30%.
- Region tags show NPC control (☯ righteous, ☠ demonic, "Freed" when open).
- (update) NPC variety: ~130 NPCs in total (7 per unclaimed wild region at the start). Wanderers may move every hour (50%); stage growth and purse refills stay daily. Each "Look for opponents" scan shows guardians and disciples always, plus a random 2–4 of the wanderers currently in the region.

## Step 16: Physician class + support arts (built)
- Fifth combat class (internal id "healer"), named Physician by the owner: support and healing magic. Staff weapons suit it.
- Passives (scale with class level): +30% healing and shields, +5% chance per turn to recover 8% health.
- Battle arts: Mending Light (heal 30% + cleanse bleeding/poison/weakness/stun), Jade Aegis (25% shield + defense), Radiant Palm (magic strike, half the damage returns as healing).
- Support arts (owner: must be EQUIPPED in one of the six slots like any art; they do nothing in battle, so they cost a battle slot; used from Cultivators nearby › Support, which lists your equipped support arts): Restoring Hands (heal another player or yourself; 2 health per energy) and Vigor Infusion (restore another player's stamina; 0.6 per energy; not on yourself). Both scale with art level and Physician class level; target must be in the same region and not fighting. Using them on others raises the art and the class.
- Owner wants healing allies inside combat later, once group battles (sect wars, raids) exist.
- (update) Vigor Infusion in battle (owner): restores energy instead of stamina. With 1v1 battles it restores your own energy (25% of max, costs 5, 4-turn cooldown); once group battles exist it should target an ally. Restoring Hands has no battle form.

## Owner design, Oct 29 2026 (afternoon): NPC sects v2, sect wars, tournaments, realms, group combat
### NPC sects v2 (planned)
- Three difficulty tiers (weak / middle / strong) so players have a range to interact with; players can trade with or attack them as they grow.
- When a player group attacks, the game generates the NPC side from the attacking group: same number of members; Easy ≈ 75% of the players' stats/skills/arts, Middle ≈ equal, Hard = higher stats, skills, arts. Harder tiers give much better rewards, so strong groups won't bother with Easy.
- The game sometimes generates an NPC sect that attacks a player sect; the admin can also trigger this from the admin panel.
- Open question to owner: three NPC sects per region, or per continent?
### Sect wars (planned)
- "Enemy" = the sect you are at war with. One sect declares war; the other accepts, or declines and takes a small penalty.
- During a war, players may not enter a town until 5 minutes after their last fight with an enemy (no attack-then-heal).
- Each sect gets a pool of points per member. Beating an enemy (via Cultivators nearby attack, or a duel) moves points from the loser's side to the winner's. Ambush attacks are worth much less than duels (duels are fair fights).
- Anti-AFK: a member who hasn't started a fight with an enemy for ~1 hour is penalized automatically — points (about one duel's worth) move to the other side — repeating each hour until they fight an enemy.
- Claude's suggestions (awaiting owner): fixed war length (e.g. 48h) with a 1h countdown; stakes (reparations or a region); points scaled by realm gap; cap/seclusion exemption on AFK penalties; allies can join; live scoreboard + Home banner.
### Tournaments (planned)
- Any player with enough stones can host. The host puts up three prizes (1st/2nd/3rd).
- A game-wide announcement goes out; players have 10 minutes to travel to the town on that continent and enter.
- Single-elimination brackets; opponents are teleported to arenas to fight; the game hands out the three prizes.
### Mystic & Divine Realms (planned)
- Magical realms that consistently hold rarer items. Mystic = in-between tier, Divine = elite.
- Open areas with many places to move between; search for items while fighting creatures and other players. Gathering professions (herbalist, miner) gather faster, as normal.
- Lose to a monster (solo or team of up to 3): drop everything picked up in the realm, sent back to the start; those items vanish (may be found again).
- Lose to players: the winners pick one item per member of the losing team to keep; the rest vanish.
### Group combat (planned, needed by the above)
- Teams of up to 3. Coin flip for who goes first. Order alternates by join order: A1 (leader), B1 (leader), A2, B2, A3, B3. Knocked-out fighters leave the rotation.
- Reaction arts can protect teammates when they are attacked. Physical classes can have passives that let them become the target of an attack aimed at a teammate (tanking).

## Step 17: group combat + parties (built)
- Battle engine now supports two teams of 1–3. Order alternates A1, B1, A2, B2, A3, B3 (coin toss decides who leads; 1v1 still uses initiative). Knocked-out or fled fighters leave the rotation; a side loses when nobody on it is standing. 15-round cap, then the side with the larger share of its total health wins.
- Targeting: each fighter has a focus (defaults to the enemy leader, then the next standing enemy). Players tap an enemy to target it; arts go at the target.
- Reactions: when an art targets someone, the target may react first; if they pass, standing teammates with usable reactions may react to shield them (one reaction per action).
- Tanking: Body Cultivators get a "guard" passive (20% × class scale) to step in front of attacks aimed at a teammate (auto-exchange blows and arts).
- Parties: up to 3, formed by invite in the same region (World › Cultivators nearby › Invite to party; answer in World › Party). Leader can remove members; leadership passes on when the leader leaves. "Hunt together": one beast per member, everyone in the same region, 20 stamina each; rewards ×1.5 per member on a win; on a loss everyone loses 5% qi and wakes in town.

## Step 18: NPC health + NPC sects v2 (built)
- NPCs keep their health between fights and regenerate 5% of max per hour (their perk — they can't heal in town). Beaten NPCs rest 3 hours, then return at half health. NPC strength is now stable per NPC (no random reroll each fight). Cultivators nearby shows how wounded an NPC is.
- Owner confirmed: THREE set NPC sects per continent — Easy, Medium, Hard. The original five land-holding sects are each continent's Hard sect; new Easy/Medium sects: Bamboo Grove Hall / Iron Mountain Clan (Azure), Willow Dew Pavilion / Ancient Beast Clan (Verdant), Sand Wolf Gang / Red Lotus Temple (desert), Snow Hare Lodge / Ice Fang Clan (snow), Starfall Wanderers / Heavenly Script Academy (central).
- Challenge a sect at its home region (World › "Sects based here"), alone or as party leader with the whole party present. Defenders mirror the challengers one-for-one: Easy 75%, Medium 100%, Hard 125% of each challenger's health, stats, skill and art levels. Rewards per member scale ×1 / ×2.2 / ×4 (qi, stones) with better item drops per tier. Each player can challenge each sect once per 20 hours. 15 stamina each.
- Sect wars (owner, pending build): take all of Claude's suggestions EXCEPT allies joining a war in progress; instead, when war is declared the defender may bring allies, and then the attacker may counter by bringing allies too.

## Step 19 — NPC raids (built)
- Each player sect has a small hourly chance (2%) to be raided; admins can trigger one (`admin_spawn_raid`).
- A raid = 2–6 raiders (one per member, capped) levelled around the sect's average, roaming the sect's wild lands (or home / nearby wilds) and moving hourly. Persistent HP + regeneration as other NPCs.
- Raiders ambush that sect's members: 50% when exploring where they are, 40% on arrival from travel. They show as 🔥 in Cultivators nearby.
- Kill them all in 48h → loot (100 × raiders × top realm) to the treasury. Otherwise they plunder 15% of it and leave.

## Step 20 — Sect wars (built)
- Leader declares on a non-allied sect with a stake: reparations (20% of loser's treasury) or one region the target controls.
- Target leader has 24h: decline (pays 5% of treasury; silence = decline) or accept, optionally calling allies; the attacker may then call up to as many allies within 1h.
- 1h countdown, then 48h war. Each side's pool = 100 × its members. Wins between enemies move points: duel 10, ambush 3, × realm-gap factor (0.5–2).
- Idle: a side that starts no fight for an hour loses 5% of its starting pool, at most 12 times.
- Enemies' ambush cooldown drops to 30 min. After a war fight, towns refuse you for 5 min.
- A pool at 0 ends it early; otherwise the higher pool wins at the end (tie = draw). Home banner + Sect › War card with scoreboard.

## Step 21 — Tournaments (built)
- Host from any town: 300-stone fee + three prizes (stones and/or an item each), escrowed. One tournament per continent at a time.
- Whole world is notified (notification + global chat). 10 minutes to be in that town and enter (host can't enter; max 32).
- Single elimination, random seeding, byes go to players who haven't had one. Matches are manual battles with fresh HP (instinct after 30 s); a player stuck in another fight for 3 min forfeits. 3rd-place match between the semifinal losers.
- Prizes paid automatically; unclaimed places (too few players) return to the host. Under 2 entrants = called off, prizes (not fee) returned.

## Step 22 — Mystic & Divine realms (built)
- Mystic: Foundation Establishment+, 200 stones, any town. Divine: Nascent Soul+, 1000 stones, Imperial Capital. One hour inside, once per 6 hours per realm.
- Six areas: Gate (safe, the only exit) → deeper areas with rising danger and rarer loot. Search costs 8 stamina, 30 s cooldown (gatherers 15 s and higher find chance).
- Searching may wake a guardian beast; party members in the same area fight beside you (up to 3). Lose → all realm treasures vanish, back to the gate.
- Players can attack each other outside the gate (party joins on both sides). Winners choose 1 treasure per defeated member (5 min, else random); the rest vanish; losers go to the gate.
- Leaving at the gate (or time running out) moves treasures into the bag. New realm-only items: Mystic Spirit Fruit, Mystic Jade Marrow, Soul-Washing Lotus, Divine Essence Pill, Fragment of the Heavenly Dao, True Dragon Scale, Phoenix Tail Feather.

## Step 23 — Admin panel (built)
- Opens by tapping the 修 seal or the "name · Admin" label (admins only; every RPC re-checks is_admin server-side).
- Overview counts, player search, full character editor (realm/stage/qi/stones/stamina/points/roots/class/profession/toxicity/name/teleport), quick fixes (heal, end stuck fight, remove from realm, end seclusion), give/take items, message, ban (1h–permanent with reason) / unban, per-player history.
- Global announcement (notification + global chat), sect treasury edit and raid trigger, admin action log.
- Bans: banned players see a ban screen; every action is refused server-side.

## Step 24 — Pacing v2, sealed roots, endless levels (owner, Oct 29 evening)
- Target: nonstop cultivation (1-hour sessions all day + full 8 h seclusion), no fighting/items/master → reach Soul Formation (realm 5, halfway, where reincarnation opens) in ~30 days with the worst root, ~21 with the best. qi_rate factor 0.011857.
- Root speed multipliers: Mixed-5 1.00, Mixed-4 1.07, Human 1.16, Earth 1.26, Heavenly 1.38, Mutant 1.52. Everyone cultivates at ×1.00 during Qi Condensation.
- Spirit root (elements, grade, speed) is sealed until Foundation Establishment, so remaking characters reveals nothing.
- After Immortal Ascension 10 you continue in Levels forever; each level needs peak qi × (1 + 0.1 × level).
- Pending (asked owner): reincarnation (unlocks at Soul Formation; guaranteed % stat bonus = steps/10 capped at 10%, anti-loop "highest point" rule proposed; 3 random benefits per category — cultivation, class, profession, stats — pick 1 each), what resets, and root perks by grade/element (modest, not overpowered).

## Step 25 — Reincarnation & root gifts (built, owner-approved table)
- Opens at Soul Formation (3-day settle time between rebirths). Each life adds a permanent % to ALL stats, stacking forever:
  Soul Formation +1, Void Refinement +1.8, Body Integration +3, Mahayana +5, Tribulation +8, Immortal Ascension +13, peak +20, +0.2 per Level after (interpolated between realms by stage). Bonus per day of effort rises with depth, so pushing further always pays more than looping.
- Blessings: 3 random offers in each of Cultivation / Class / Profession / Stats (quality from progress; no class/profession → weaker generic offers); pick 1 each. Offers are fixed per progress tier (no rerolling).
- Resets: realm/stage, new sealed random root, class, profession, stats, skills, arts, upgrades, toxicity, equipped gear. Kept: bag, stones, sect, master/pupils, soul bonus and blessings.
- Root gifts (after Foundation Establishment): all stats +0/0/2/3/5/5% (Mixed/Mixed/Human/Earth/Heavenly/Mutant); element gifts split across your elements: Fire energy recovery, Water health recovery, Earth max health, Metal damage, Wood stamina, Lightning dodge, Ice parry, Nature healing power.
- Character › Rebirth screen. Account name removed from the top bar; admin opens from the seal. Admin player picker is an A–Z scrolling list with live filter.

## Step 26 — Guide & Settings (built)
- Home › Guide: tabbed player guide (Start, Cultivation, Spirit roots, Combat, Classes & crafts, World, Sects & war, Realms & events, Rebirth). Keep it updated when mechanics change.
- Home › Settings: text size, reduce motion, fight modes (beasts/players auto or manual), chat red dots, update message, sign out. Display settings are stored per device.

## Step 27 — Realm openings (owner, Oct 29 evening)
- Realms are not always open. Each game day every town rolls: Lesser 60% (10 h), Mystic 25% (8 h), Divine 6% (6 h), each opening at a random hour. Admin can open (town, tier, hours) or close realms.
- Tiers: Lesser (anyone, 50 stones, common loot), Mystic (Foundation Establishment+, 200), Divine (Nascent Soul+, 1000, danger 5–8 — party advised).
- Each opening: element theme (shapes beasts) and quality good/great/exceptional (better loot + find chance). Instances are per opening (people/PvP only within it). Closing casts everyone out with their loot.
- Mystic openings notify players on that continent; Divine notifies everyone. Town shows Secret realms badge + rumors of realms open in other towns.
- Physician: "Use on yourself" for Restoring Hands on its slot in Character › Arts. Vigor Infusion gives others stamina at a poor rate (0.3 stamina per energy at level 1), others only.
