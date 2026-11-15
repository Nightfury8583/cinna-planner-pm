import React from 'react'

/** An on/off slide switch: grey with the knob on the left when off, green with the knob on the right when on. */
function Switch({label, checked, onChange}) {
    return (
        <label className="ffSwitch">
            <input
                className="ffSwitchInput"
                type="checkbox"
                role="switch"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span className="ffSwitchTrack" aria-hidden="true">
                <span className="ffSwitchKnob"/>
            </span>
            <span className="ffSwitchLabel">{label}</span>
        </label>
    )
}

export default Switch
