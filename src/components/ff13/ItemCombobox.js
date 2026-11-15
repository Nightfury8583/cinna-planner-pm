import React, {useEffect, useId, useRef, useState} from 'react'

/**
 * A dropdown you can also type into. The arrow is always visible, clicking or focusing the box opens
 * the full list, and typing filters it (exact and prefix matches first). Pick with the mouse, or with
 * Up/Down + Enter. Escape closes it. Clearing the text clears the selection.
 *
 * options: [{id, name, detail}]   detail is the grey text shown next to the name in the list.
 */

function filterOptions(options, query) {
    if (query === '') return options
    const rank = (name) => {
        const lower = name.toLowerCase()
        if (lower === query) return 0
        if (lower.startsWith(query)) return 1
        if (lower.includes(query)) return 2
        return 3
    }
    return options
        .map((option) => ({option, rank: rank(option.name)}))
        .filter((entry) => entry.rank < 3)
        .sort((a, b) => a.rank - b.rank) // stable: keeps the original order inside a rank
        .map((entry) => entry.option)
}

function ItemCombobox({label, options, selectedId, onSelect, placeholder}) {
    const inputId = useId()
    const listId = `${inputId}-list`
    const inputRef = useRef(null)
    const highlightedRef = useRef(null)

    const selected = options.find((option) => option.id === selectedId)
    const [text, setText] = useState(selected ? selected.name : '')
    const [open, setOpen] = useState(false)
    const [filtering, setFiltering] = useState(false) // false = show the whole list
    const [highlight, setHighlight] = useState(0)

    // Keep the text in sync when the selection changes.
    useEffect(() => {
        setText(selected ? selected.name : '')
    }, [selected])

    const query = text.trim().toLowerCase()
    const visible = filtering ? filterOptions(options, query) : options

    // Keep the highlighted row in view while using the arrow keys.
    useEffect(() => {
        if (open && highlightedRef.current && highlightedRef.current.scrollIntoView) {
            highlightedRef.current.scrollIntoView({block: 'nearest'})
        }
    }, [open, highlight, visible.length])

    const close = () => {
        setOpen(false)
        setFiltering(false)
        setText(selected ? selected.name : '')
    }

    const choose = (option) => {
        setOpen(false)
        setFiltering(false)
        setText(option.name)
        if (option.id !== selectedId) onSelect(option.id)
    }

    const handleChange = (event) => {
        const value = event.target.value
        setText(value)
        setFiltering(true)
        setOpen(true)
        setHighlight(0)
        if (value.trim() === '') onSelect(null)
    }

    // Leaving the box with a complete name typed in selects it; anything else snaps back.
    const handleBlur = () => {
        const exact = options.find((option) => option.name.toLowerCase() === query)
        if (exact && query !== '') choose(exact)
        else close()
    }

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            if (!open) setOpen(true)
            else setHighlight((h) => Math.min(h + 1, visible.length - 1))
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
        } else if (event.key === 'Enter') {
            if (open && visible[highlight]) {
                event.preventDefault()
                choose(visible[highlight])
            }
        } else if (event.key === 'Escape') {
            close()
        }
    }

    const toggle = (event) => {
        event.preventDefault() // do not steal focus from the input
        if (open) {
            close()
        } else {
            setFiltering(false)
            setOpen(true)
            if (inputRef.current) inputRef.current.focus()
        }
    }

    return (
        <div className="ffField">
            <label className="ffLabel" htmlFor={inputId}>{label}</label>
            <div className="ffCombo">
                <input
                    id={inputId}
                    ref={inputRef}
                    className="ffInput ffComboInput"
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    value={text}
                    placeholder={placeholder}
                    autoComplete="off"
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={(event) => {
                        setFiltering(false)
                        setOpen(true)
                        event.target.select()
                    }}
                    onBlur={handleBlur}
                />
                <button
                    type="button"
                    className="ffArrowButton"
                    aria-label={`Show ${label} list`}
                    tabIndex={-1}
                    onMouseDown={toggle}
                >
                    ▾
                </button>
                {open && (
                    <ul id={listId} className="ffList" role="listbox">
                        {visible.length === 0 && <li className="ffNoMatch">No matches</li>}
                        {visible.map((option, index) => (
                            <li
                                key={option.id}
                                role="option"
                                aria-selected={option.id === selectedId}
                                ref={index === highlight ? highlightedRef : null}
                                className={
                                    'ffOption' +
                                    (index === highlight ? ' ffHighlight' : '') +
                                    (option.id === selectedId ? ' ffChosen' : '')
                                }
                                // mousedown (not click) so the input does not blur and close the list first
                                onMouseDown={(event) => {
                                    event.preventDefault()
                                    choose(option)
                                }}
                                onMouseEnter={() => setHighlight(index)}
                            >
                                <span>{option.name}</span>
                                {option.detail && <span className="ffOptionDetail">{option.detail}</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default ItemCombobox
