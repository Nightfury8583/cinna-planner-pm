import React, {useState} from 'react'
import {ClassMap} from '../utils/AwakeningClasses.js'
import {StaticParents, UnitMap} from '../utils/AwakeningUnits.js'

function getParentGrowthRates(parentName) {
    let kids =
        ['Lucina', 'Owain', 'Inigo', 'Brady', 'Kjelle', 'Cynthia', 'Severa',
            'Gerome', 'Morgan', 'Yarne', 'Laurent', 'Noire', 'Nah']

    if (kids.includes(parentName))
    {
        let kidParentDiv = document.querySelector(`.${parentName}`)
        let kidParentRow = kidParentDiv.closest('tr')
        let allKidParentCells = Array.from(kidParentRow.querySelectorAll('td'))
        let classSelection = allKidParentCells[2].querySelector('select').value

        let kidParentFullGrowths = allKidParentCells.slice(3, -1).map(it => Number(it.querySelectorAll(`span`)[0].innerText))
        let kidParentModifiersString = allKidParentCells.slice(4, -1).map(it => it.querySelectorAll(`span`)[1].innerText)
        let kidParentModifiers = kidParentModifiersString.map(str => parseInt(str.match(/-?\d+/)[0]));
        let classGrowthRates = ClassMap[classSelection]["GrowthRates"]

        let differences = [];
        for (let i = 0; i < kidParentFullGrowths.length; i++) {
            differences.push(Math.abs(kidParentFullGrowths[i] - classGrowthRates[i]));
        }

        return [differences, kidParentModifiers]
    }
    else return [UnitMap[parentName]["GrowthRates"], UnitMap[parentName]["Modifiers"]]
}

/**
 * Calculate the final growth rates of the kid unit.
 */
function calculateStats(kidSelection, parentSelection, classSelection) {
    let parentStats = getParentGrowthRates(parentSelection)
    let parentGrowthRates = parentStats[0]
    let kidGrowthRates = UnitMap[kidSelection]["GrowthRates"]
    let staticParentGrowthRates = StaticParents[kidSelection]["GrowthRates"]
    let classGrowthRates = ClassMap[classSelection]["GrowthRates"]

    let kidModifiers = UnitMap[kidSelection]["Modifiers"]
    let parentModifiers = parentStats[1]
    let staticModifiers = StaticParents[kidSelection]["Modifiers"]

    let finalGrowthRates = []
    let modifiers = []
    for (let i = 0 ; i < kidGrowthRates.length ; i++) {
        let calculatedKidGrowth = ((kidGrowthRates[i] + parentGrowthRates[i] + staticParentGrowthRates[i]) / 3) + classGrowthRates[i]
        finalGrowthRates.push(Math.floor(calculatedKidGrowth))
        modifiers.push(kidModifiers[i - 1] + parentModifiers[i - 1] + staticModifiers[i - 1])
    }

    finalGrowthRates.push(Math.floor(finalGrowthRates.reduce((acc, curr) => acc + curr, 0) / finalGrowthRates.length))

    return [finalGrowthRates, modifiers]
}

let updateStats = (kidOrKidClassName) => {
    let kidDiv = document.querySelector(`.${kidOrKidClassName}`)
    let kidRow = kidDiv.closest('tr')
    let allKidCells = Array.from(kidRow.querySelectorAll('td'))

    let kidSelection = allKidCells[0].innerText
    let parentSelection = allKidCells[1].querySelector('select').value
    let classSelection = allKidCells[2].querySelector('select').value

    let stats = calculateStats(kidSelection, parentSelection, classSelection)
    let finalGrowthRates = stats[0]
    let modifiers = stats[1]

    allKidCells.slice(3).forEach((cell, index) => {
        let dataFields = cell.querySelectorAll('span')
        let statField = dataFields[0]
        let modifierField = dataFields[1]

        statField.innerText = finalGrowthRates[index]

        //Modifiers aren't for 1/8
        if(index === 0 || index === 8){}
        else modifierField.innerText = ` (${modifiers[index]})`

        //Color Growth Rates
        if (finalGrowthRates[index] >= 50) {
            if (modifiers[index] > 0) {
                cell.style.backgroundColor = `#FFFFE0`
            }
            statField.style.color = `Green`
        }
        else if (finalGrowthRates[index] <= 30) {
            if(modifiers[index] < 0 ) {
                cell.style.backgroundColor = `#FFE0E0`
            }
            statField.style.color = 'Red'
        }
        else {
            statField.style.color = `Black`
            cell.style.backgroundColor = allKidCells[1].style.backgroundColor
        }

        //Color Stat Modifiers
        if (modifiers[index] > 0) {
            modifierField.style.color = `Green`
        }
        else if (modifiers[index] < 0) {
            modifierField.style.color = 'Red'
        }
        else {
            modifierField.style.color = `Black`
            cell.style.backgroundColor = allKidCells[1].style.backgroundColor
        }
    })
}

let Select = ({ options, onSelect }) => {
    let [selectedValue, setSelectedValue] = useState('')

    let handleChange = (e) => {
        let value = e.target.value
        setSelectedValue(value)
        onSelect(value)
    }

    return (
        <select value={selectedValue} onChange={handleChange}>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}

let DropdownFE = (props) => {
    let dropdownClassName = props.className
    let list = props.list.map(unitMap => [unitMap["Name"], ...unitMap["GrowthRates"]])

    let options = []
    list.forEach((option) =>{
        options.push({ label: option[0], value: option[0] })
    })

    let handleSelect = () => {
        updateStats(dropdownClassName)
    }

    return (
        <div className={dropdownClassName}>
            <Select options={options} onSelect={handleSelect} />
        </div>
    )
}

export default DropdownFE