import React, {useMemo, useState} from 'react'
import {ComponentList, ComponentMap, Constants, ItemList, ItemMap} from '../data/ff13'
import {
    baseExpFor,
    boosterOptions,
    calculatePlan,
    defaultProgress,
    expForNextLevel,
    expOptions,
    maxStats,
} from '../utils/ff13Calc'
import ItemCombobox from '../components/ff13/ItemCombobox'
import StageCard from '../components/ff13/StageCard'
import Totals from '../components/ff13/Totals'
import Switch from '../components/ff13/Switch'
import {formatGil, formatNumber, formatStats} from '../components/ff13/format'

const DATA = {itemMap: ItemMap, componentMap: ComponentMap, constants: Constants}

// Built once: these never change while the app runs.
// Same order as the data files: all weapons (each upgrade chain together), then all accessories.
// To sort differently, chain a .sort(...) onto this, e.g. .sort((a, b) => a.rank - b.rank) after adding rank.
const ITEM_OPTIONS = ItemList
    .map((item) => ({id: item.id, name: item.name, detail: `${item.kind} · rank ${item.rank}`}))
const BOOSTERS = boosterOptions(ComponentList)
const EXP_COMPONENTS = expOptions(ComponentList)

const priceLabel = (component) =>
    component.buyPrice == null ? 'drop only' : `${formatGil(component.buyPrice)} each`

// "13 EXP" for the picked item's rank, or "1–14 EXP" (lowest to highest rank) when no item is picked.
function expLabel(component, item) {
    if (item) return `${formatNumber(baseExpFor(component, item))} EXP`
    const values = component.expByRank
    return `${formatNumber(Math.min(...values))}–${formatNumber(Math.max(...values))} EXP`
}

function FF13() {
    const [itemId, setItemId] = useState(null)
    const [goal, setGoal] = useState('master')
    const [level, setLevel] = useState(1)
    const [expInto, setExpInto] = useState(0)
    const [boosterId, setBoosterId] = useState(null)
    const [expId, setExpId] = useState(null)
    const [includeDrops, setIncludeDrops] = useState(false) // false = only components you can buy

    const plan = useMemo(
        () => (itemId ? calculatePlan(DATA, {itemId, goal, level, expInto, boosterId, expId}) : null),
        [itemId, goal, level, expInto, boosterId, expId]
    )

    const handleItem = (id) => {
        setItemId(id)
        if (id) {
            const progress = defaultProgress(ItemMap[id], ItemMap)
            setLevel(progress.level)
            setExpInto(progress.expInto)
        }
    }

    const item = plan ? plan.item : null

    // By default only components that can be bought are offered; the switch adds the drop-only ones.
    const boosterChoices = useMemo(
        () => BOOSTERS
            .filter((c) => includeDrops || c.buyPrice != null)
            .map((c) => ({
                id: c.id,
                name: c.name,
                detail: `+${c.bonus} bonus · ${priceLabel(c)}`,
            })),
        [includeDrops]
    )
    // EXP depends on the item's rank: exact once an item is picked, otherwise the range over all ranks.
    const expChoices = useMemo(
        () => EXP_COMPONENTS
            .filter((c) => includeDrops || c.buyPrice != null)
            .map((c) => ({
                id: c.id,
                name: c.name,
                detail: `${expLabel(c, item)} · ${priceLabel(c)}`,
            })),
        [includeDrops, item]
    )

    const handleIncludeDrops = (on) => {
        setIncludeDrops(on)
        if (!on) {
            // Do not leave a selection behind that is no longer in the list.
            const buyable = (id) => id && ComponentMap[id].buyPrice != null
            setBoosterId((current) => (buyable(current) ? current : null))
            setExpId((current) => (buyable(current) ? current : null))
        }
    }
    const finalItem = plan ? plan.ultimate : null
    const hasUpgrades = item && item.upgradesTo
    const nextLevelCost = item ? expForNextLevel(item, plan.progress.level) : null

    return (
        <div className="ffContainer">
            <div className="ffPage">
                <h1 className="ffTitle">FF13 Upgrade Calculator</h1>

                <section className="ffCard">
                    <ItemCombobox
                        label="Weapon or accessory"
                        options={ITEM_OPTIONS}
                        selectedId={itemId}
                        onSelect={handleItem}
                        placeholder="Start typing a name, e.g. Blazefire Saber"
                    />

                    <div className="ffRow">
                        <ItemCombobox
                            label="Booster (organic, for 3x)"
                            options={boosterChoices}
                            selectedId={boosterId}
                            onSelect={setBoosterId}
                            placeholder="e.g. Sturdy Bone"
                        />
                        <ItemCombobox
                            label="EXP component"
                            options={expChoices}
                            selectedId={expId}
                            onSelect={setExpId}
                            placeholder="e.g. Perfect Conductor"
                        />
                    </div>
                    <Switch
                        label="Include drop-only components"
                        checked={includeDrops}
                        onChange={handleIncludeDrops}
                    />

                    {item && (
                        <>
                            {hasUpgrades && (
                                <div className="ffRadios">
                                    <label>
                                        <input
                                            type="radio"
                                            name="ffGoal"
                                            checked={goal === 'master'}
                                            onChange={() => setGoal('master')}
                                        />
                                        {' '}Just this one
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="ffGoal"
                                            checked={goal === 'ultimate'}
                                            onChange={() => setGoal('ultimate')}
                                        />
                                        {' '}Through to the final form
                                    </label>
                                </div>
                            )}

                            <div className="ffRow">
                                <label className="ffField ffSmall">
                                    <span className="ffLabel">Level</span>
                                    <input
                                        className="ffInput"
                                        type="number"
                                        min={item.startLevel}
                                        max={item.maxLevel}
                                        value={level}
                                        onChange={(e) => setLevel(e.target.value)}
                                    />
                                </label>
                                <label className="ffField ffSmall">
                                    <span className="ffLabel">
                                        EXP into level{nextLevelCost != null ? ` (of ${nextLevelCost.toLocaleString('en-US')})` : ''}
                                    </span>
                                    <input
                                        className="ffInput"
                                        type="number"
                                        min={0}
                                        value={expInto}
                                        disabled={nextLevelCost == null}
                                        onChange={(e) => setExpInto(e.target.value)}
                                    />
                                </label>
                            </div>
                        </>
                    )}
                </section>

                {!plan && (
                    <p className="ffMuted">Pick a weapon or accessory to get started.</p>
                )}

                {plan && (
                    <>
                        <section className="ffCard">
                            <h2 className="ffCardTitle">{item.name}</h2>
                            <div className="ffMuted">{item.kind} · rank {item.rank}</div>
                            <div>Max (★): <strong>{formatStats(maxStats(item))}</strong></div>
                            {finalItem && finalItem.id !== item.id && (
                                <div>
                                    {item.kind === 'weapon' ? 'Ultimate' : 'Final form'}: {finalItem.name}
                                    {' '}— max (★): <strong>{formatStats(maxStats(finalItem))}</strong>
                                </div>
                            )}
                        </section>

                        {plan.stages.map((stage, index) => (
                            <StageCard
                                key={`${itemId}-${goal}-${stage.item.id}`}
                                stage={stage}
                                number={index + 1}
                            />
                        ))}

                        <Totals totals={plan.totals}/>

                        <p className="ffMuted ffFootnote">
                            Assumes the bonus starts again at 0 after each catalyst upgrade, and that only gil
                            from components you can buy is counted. Overshooting the star level wastes EXP.
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

export default FF13
