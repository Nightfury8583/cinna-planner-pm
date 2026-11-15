import React from 'react'
import {formatGil, formatNumber} from './format'

function Totals({totals}) {
    const {gil, unbuyable, creditChip, incentiveChip} = totals

    return (
        <section className="ffCard ffTotals">
            <h2 className="ffCardTitle">Totals</h2>
            <dl className="ffLines">
                <div className="ffLine">
                    <dt>Gil</dt>
                    <dd><strong>{formatGil(gil)}</strong></dd>
                </div>
                <div className="ffLine">
                    <dt>{creditChip.component.name}s</dt>
                    <dd>
                        <strong>{formatNumber(creditChip.count)}</strong>
                        <span className="ffMuted"> ({formatGil(creditChip.component.sellPrice)} each)</span>
                    </dd>
                </div>
                <div className="ffLine">
                    <dt>{incentiveChip.component.name}s</dt>
                    <dd>
                        <strong>{formatNumber(incentiveChip.count)}</strong>
                        <span className="ffMuted"> ({formatGil(incentiveChip.component.sellPrice)} each)</span>
                    </dd>
                </div>
            </dl>
            <p className="ffMuted">
                Each chip line is the whole total on its own, not a mix. Chips are sold to a shop for gil.
            </p>
            {unbuyable.length > 0 && (
                <p className="ffWarning">
                    Not included in the total (not sold in shops): {unbuyable.join(', ')}
                </p>
            )}
        </section>
    )
}

export default Totals
