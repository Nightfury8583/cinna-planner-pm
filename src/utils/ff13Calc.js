/**
 * FF13 weapon / accessory upgrade calculator. Pure functions only: the data (items, components,
 * constants) is passed in, so this file has no React or JSON imports and can be tested on its own.
 *
 * Rules (see src/data/ff13/README.md):
 *  - EXP to reach level L (L >= 2) = expBase + expPerLevel * (L - 2). Level 1 costs 0.
 *  - A component gives expByRank[item.rank - 1] EXP, times the item's current multiplier.
 *  - Each component adds `bonus` to the item's bonus total; the total picks the multiplier. The
 *    multiplier applies to a batch BEFORE that batch's own bonus is added. At most 99 per batch.
 *  - Upgrading carries all EXP over, so the next stage only needs next.masterExp - current.masterExp.
 *  - Assumed (unconfirmed): the bonus total starts again at 0 for every stage.
 */

// ---------------------------------------------------------------------------------------- levels

/** Total EXP from level 1 to arrive at `level`. */
export function expToReach(item, level) {
    const steps = level - 1;
    if (steps <= 0) return 0;
    return steps * item.expBase + item.expPerLevel * ((steps - 1) * steps) / 2;
}

/** EXP needed to go from `level` to `level + 1`, or null at the star level. */
export function expForNextLevel(item, level) {
    if (level >= item.maxLevel) return null;
    return item.expBase + item.expPerLevel * (level - 1);
}

/** Turn total EXP (from level 1) into {level, expInto}. Anything past the star level is lost. */
export function levelFromTotalExp(item, totalExp) {
    if (totalExp >= item.masterExp) return {level: item.maxLevel, expInto: 0};
    let level = 1;
    while (level < item.maxLevel && expToReach(item, level + 1) <= totalExp) level++;
    return {level, expInto: totalExp - expToReach(item, level)};
}

/**
 * Where a freshly obtained item starts. Upgrade-only items start with the EXP carried over from
 * the item they are upgraded from; everything else starts at level 1 / its start level with 0 EXP.
 */
export function defaultProgress(item, itemMap) {
    if (item.buyPrice == null && item.upgradedFrom && item.upgradedFrom.length > 0) {
        const source = itemMap[item.upgradedFrom[0].item];
        if (source) return levelFromTotalExp(item, source.masterExp);
    }
    return {level: item.startLevel, expInto: 0};
}

/** Clamp user input to something the item can really be at. */
export function normalizeProgress(item, level, expInto) {
    const lvl = Math.min(item.maxLevel, Math.max(item.startLevel, Math.floor(Number(level)) || item.startLevel));
    const cost = expForNextLevel(item, lvl);
    const max = cost == null ? 0 : cost - 1;
    const exp = Math.min(max, Math.max(0, Math.floor(Number(expInto)) || 0));
    return {level: lvl, expInto: exp};
}

export function totalExpAt(item, level, expInto) {
    return expToReach(item, level) + expInto;
}

// ---------------------------------------------------------------------------------------- chain

/** The items to go through, starting with `item`. goal: "master" (just this one) or "ultimate". */
export function upgradeChain(item, itemMap, goal) {
    const chain = [item];
    if (goal !== 'ultimate') return chain;
    let current = item;
    while (current.upgradesTo && chain.length < 20) {
        const next = itemMap[current.upgradesTo.item];
        if (!next) break;
        chain.push(next);
        current = next;
    }
    return chain;
}

// ---------------------------------------------------------------------------------------- bonus

/** Multiplier for a bonus total. `tiers` is constants.bonusTiers (ascending). */
export function multiplierFor(bonusTotal, tiers) {
    let multiplier = tiers[0].multiplier;
    for (const tier of tiers) {
        if (bonusTotal >= tier.minBonus) multiplier = tier.multiplier;
    }
    return multiplier;
}

/** EXP one component gives an item at 1x. */
export function baseExpFor(component, item) {
    if (!component.expByRank) return 0;
    return component.expByRank[item.rank - 1] || 0;
}

/**
 * Apply `count` of one component in batches of at most `maxBatch`.
 * Returns the EXP gained (each batch uses the multiplier from the bonus *before* that batch),
 * the resulting bonus total and the number of batches.
 */
export function applyComponent({component, item, count, bonusStart, tiers, maxBatch}) {
    const baseExp = baseExpFor(component, item);
    let bonus = bonusStart;
    let exp = 0;
    let left = count;
    let batches = 0;
    while (left > 0) {
        const size = Math.min(maxBatch, left);
        exp += Math.floor(size * baseExp * multiplierFor(bonus, tiers));
        bonus += size * component.bonus;
        left -= size;
        batches++;
    }
    return {exp, bonus, batches};
}

// ---------------------------------------------------------------------------------------- stage

function priceOf(component, count) {
    return component.buyPrice == null ? null : component.buyPrice * count;
}

/**
 * One stage: bring `item` (currently holding startTotalExp) to its star level.
 * Optional: `booster` (organic component used to reach 3x) and `expComponent` (component used for EXP).
 */
export function calculateStage({item, nextItem, startTotalExp, booster, expComponent, catalyst, constants}) {
    const tiers = constants.bonusTiers;
    const maxBatch = constants.maxComponentsPerBatch;
    const topTier = tiers[tiers.length - 1];
    const needed = Math.max(0, item.masterExp - startTotalExp);
    const start = levelFromTotalExp(item, startTotalExp);
    const warnings = [];

    const stage = {
        item,
        nextItem: nextItem || null,
        startLevel: start.level,
        startExpInto: start.expInto,
        needed,
        booster: null,
        exp: null,
        catalyst: null,
        remainingAfterPicks: needed,
        gil: 0,
        unbuyable: [],
        warnings,
    };

    let bonus = 0;
    let expSoFar = 0;

    if (needed > 0 && booster && booster.bonus > 0) {
        const count = Math.ceil(topTier.minBonus / booster.bonus);
        const result = applyComponent({
            component: booster, item, count, bonusStart: 0, tiers, maxBatch,
        });
        bonus = result.bonus;
        expSoFar = result.exp;
        stage.booster = {
            component: booster,
            count,
            batches: result.batches,
            bonusGained: result.bonus,
            multiplierAfter: multiplierFor(result.bonus, tiers),
            expGained: result.exp,
            gil: priceOf(booster, count),
        };
    }

    const remaining = Math.max(0, needed - expSoFar);
    stage.remainingAfterPicks = remaining;

    if (needed > 0 && expComponent) {
        const baseExp = baseExpFor(expComponent, item);
        const multiplier = multiplierFor(bonus, tiers);
        if (baseExp <= 0) {
            warnings.push(`${expComponent.name} gives no EXP.`);
        } else if (remaining === 0) {
            stage.exp = {
                component: expComponent, baseExp, multiplier, count: 0, batches: 0,
                totalExp: 0, overshoot: 0, gil: 0,
            };
        } else {
            let count = Math.ceil(remaining / (baseExp * multiplier));
            // Guard against rounding down inside a batch.
            while (applyComponent({
                component: expComponent, item, count, bonusStart: bonus, tiers, maxBatch,
            }).exp < remaining && count < 10000000) count++;
            const result = applyComponent({
                component: expComponent, item, count, bonusStart: bonus, tiers, maxBatch,
            });
            stage.exp = {
                component: expComponent,
                baseExp,
                multiplier,
                count,
                batches: result.batches,
                totalExp: result.exp,
                overshoot: result.exp - remaining,
                gil: priceOf(expComponent, count),
            };
            stage.remainingAfterPicks = 0;
            if (result.batches > 1) {
                const bonusAfterFirst = bonus + maxBatch * expComponent.bonus;
                const multAfterFirst = multiplierFor(bonusAfterFirst, tiers);
                warnings.push(
                    `This needs ${result.batches} batches (max ${maxBatch} per batch). ` +
                    (multAfterFirst < multiplier
                        ? `After the first batch the multiplier drops to ${multAfterFirst}x, so apply boosters again ` +
                          `between batches. The count above assumes ${multiplier}x for every batch and the extra ` +
                          `boosters are not costed.`
                        : `The multiplier stays at ${multiplier}x between batches.`)
                );
            }
            if (!stage.booster) {
                warnings.push('No booster picked, so everything is calculated at 1x.');
            }
        }
    }

    if (nextItem && catalyst) {
        stage.catalyst = {component: catalyst, gil: catalyst.buyPrice};
    }

    for (const part of [stage.booster, stage.exp, stage.catalyst]) {
        if (!part) continue;
        if (part.gil == null) {
            if (!stage.unbuyable.includes(part.component.name)) stage.unbuyable.push(part.component.name);
        } else {
            stage.gil += part.gil;
        }
    }
    return stage;
}

// ---------------------------------------------------------------------------------------- plan

/**
 * Whole plan: every stage from the chosen item to the end of the chosen goal, plus totals.
 *
 * input:  {itemId, goal, level, expInto, boosterId, expId}
 *         boosterId / expId are optional and are used for every stage.
 * data:   {itemMap, componentMap, constants}
 */
export function calculatePlan(data, input) {
    const {itemMap, componentMap, constants} = data;
    const item = itemMap[input.itemId];
    if (!item) return null;

    const progress = normalizeProgress(item, input.level, input.expInto);
    const chain = upgradeChain(item, itemMap, input.goal);
    const booster = input.boosterId ? componentMap[input.boosterId] : null;
    const expComponent = input.expId ? componentMap[input.expId] : null;
    const stages = [];
    let startTotal = totalExpAt(item, progress.level, progress.expInto);

    chain.forEach((stageItem, index) => {
        const nextItem = chain[index + 1];
        const catalystId = nextItem ? stageItem.upgradesTo.catalyst : null;
        stages.push(calculateStage({
            item: stageItem,
            nextItem,
            startTotalExp: startTotal,
            booster,
            expComponent,
            catalyst: catalystId ? componentMap[catalystId] : null,
            constants,
        }));
        startTotal = stageItem.masterExp; // all EXP carries over into the next stage
    });

    const gil = stages.reduce((sum, s) => sum + s.gil, 0);
    const unbuyable = [...new Set(stages.flatMap((s) => s.unbuyable))];
    const credit = componentMap[constants.chips.credit];
    const incentive = componentMap[constants.chips.incentive];
    return {
        item,
        ultimate: itemMap[item.ultimateId],
        progress,
        stages,
        totals: {
            gil,
            unbuyable,
            creditChip: {component: credit, count: Math.ceil(gil / credit.sellPrice)},
            incentiveChip: {component: incentive, count: Math.ceil(gil / incentive.sellPrice)},
        },
    };
}

// ---------------------------------------------------------------------------------------- display helpers

/** Stat summary for an item at its star level: [{label, value}]. */
export function maxStats(item) {
    if (item.kind === 'weapon') {
        const stats = [];
        if (item.maxStrength != null) stats.push({label: 'Str', value: item.maxStrength});
        if (item.maxMagic != null) stats.push({label: 'Mag', value: item.maxMagic});
        return stats;
    }
    if (item.maxBonus != null) return [{label: item.ability.replace(/\s*\+?X.*$/, '').replace(/:\s*$/, ''), value: item.maxBonus}];
    return [];
}

/** Option lists for the component pickers. */
export function boosterOptions(components) {
    return components
        .filter((c) => c.type === 'organic' && c.bonus > 0 && !c.premium)
        .sort((a, b) => a.name.localeCompare(b.name));
}

export function expOptions(components) {
    return components
        .filter((c) => c.type !== 'catalyst' && !c.premium && c.expByRank)
        .sort((a, b) => a.name.localeCompare(b.name));
}
