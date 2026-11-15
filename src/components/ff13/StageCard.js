import React from 'react'
import {maxStats} from '../../utils/ff13Calc'
import {formatGil, formatNumber, formatStats} from './format'

function Line({label, children}) {
    return (
        <div className="ffLine">
            <dt>{label}</dt>
            <dd>{children}</dd>
        </div>
    )
}

function StageCard({stage, number}) {
    const {item, nextItem, booster, exp, catalyst} = stage

    return (
        <section className="ffCard">
            <h2 className="ffCardTitle">
                Stage {number}: {item.name}
                {nextItem ? <span className="ffArrow"> → {nextItem.name}</span> : null}
            </h2>
            <div className="ffMuted">
                Rank {item.rank} · max (★) {formatStats(maxStats(item))} ·
                starts at level {stage.startLevel}
                {stage.startExpInto > 0 ? ` (+${formatNumber(stage.startExpInto)} EXP)` : ''}
            </div>

            <dl className="ffLines">
                <Line label="EXP needed">
                    {stage.needed > 0
                        ? formatNumber(stage.needed)
                        : 'none, already at the star level'}
                </Line>

                {stage.needed > 0 && (
                    <Line label="Booster">
                        {booster ? (
                            <>
                                {formatNumber(booster.count)} × {booster.component.name}
                                {' '}= +{formatNumber(booster.bonusGained)} bonus → {booster.multiplierAfter}x
                                <div className="ffDetail">
                                    gives {formatNumber(booster.expGained)} EXP
                                    {booster.batches > 1 ? ` · ${booster.batches} batches` : ''}
                                    {' · '}{booster.gil == null ? 'not sold in shops' : formatGil(booster.gil)}
                                </div>
                            </>
                        ) : (
                            <span className="ffMuted">none picked, everything is at 1x</span>
                        )}
                    </Line>
                )}

                {stage.needed > 0 && (
                    <Line label="EXP component">
                        {exp ? (
                            exp.count === 0 ? (
                                <span className="ffMuted">not needed, the booster already covers it</span>
                            ) : (
                                <>
                                    {formatNumber(exp.count)} × {exp.component.name}
                                    <div className="ffDetail">
                                        {formatNumber(exp.baseExp)} EXP × {exp.multiplier}x
                                        = {formatNumber(Math.floor(exp.baseExp * exp.multiplier))} each
                                        {' → '}{formatNumber(exp.totalExp)} EXP
                                        {exp.overshoot > 0 ? ` (${formatNumber(exp.overshoot)} over)` : ''}
                                        {exp.batches > 1 ? ` · ${exp.batches} batches` : ''}
                                        {' · '}{exp.gil == null ? 'not sold in shops' : formatGil(exp.gil)}
                                    </div>
                                </>
                            )
                        ) : (
                            <span className="ffMuted">
                                pick an EXP component above; {formatNumber(stage.remainingAfterPicks)} EXP still to cover
                            </span>
                        )}
                    </Line>
                )}

                {catalyst && (
                    <Line label="Catalyst">
                        {catalyst.component.name}
                        <div className="ffDetail">{formatGil(catalyst.gil)}</div>
                    </Line>
                )}

                <Line label="Stage total">
                    <strong>{formatGil(stage.gil)}</strong>
                    {stage.unbuyable.length > 0 && (
                        <div className="ffDetail">
                            not counted (not sold in shops): {stage.unbuyable.join(', ')}
                        </div>
                    )}
                </Line>
            </dl>

            {stage.warnings.map((warning) => (
                <p className="ffWarning" key={warning}>{warning}</p>
            ))}
        </section>
    )
}

export default StageCard
