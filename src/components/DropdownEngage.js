import React, {useState} from 'react'
import {ClassMap} from '../utils/AwakeningClasses.js'
import {StaticParents, UnitMap} from '../utils/AwakeningUnits.js'
import {EngageUnits, EngageUnitsMap} from "../utils/EngageUnits";
import {EngageClassMap} from "../utils/EngageClasses";

let orginialTable
let imBad = 0

let filterClasses = () => {
    const selectedRows = Array.from(document.querySelectorAll('.engageTable tbody tr'))
        .filter(row => row.querySelector('input[type="checkbox"]:checked'));

    if (selectedRows.length === 0) {
        return
    }

    document.querySelectorAll('.engageTable tbody tr').forEach(row => {
        if (!row.querySelector('input[type="checkbox"]:checked')) {
            row.remove();
        }
    });
}

let updateStats = (selectedUnit) => {
    if(imBad === 0){
        imBad = 1
        orginialTable = document.querySelector('.engageTable tbody').innerHTML
    }

    let tableBody = document.querySelector('.engageTable tbody');
    let currentTable = tableBody.innerHTML;

    if (currentTable !== orginialTable) {
        tableBody.innerHTML = orginialTable; // Store the original rows
    }

    let selectedCharacterGrowthRates = EngageUnitsMap[selectedUnit]["GrowthRates"]
    let selectedCharacterModifiers = EngageUnitsMap[selectedUnit]["Modifiers"]

    let table = document.querySelector('table')
    let allRows = Array.from(table.querySelectorAll('tr'))

    allRows.slice(1).forEach(row => {
        let average = 0
        let allCells = Array.from(row.querySelectorAll('td'))
        let className = allCells[0].innerText
        let classInfo = EngageClassMap[className]

        allCells.slice(1, -1).forEach((cell, index) => {
            let dataFields = cell.querySelectorAll('span')
            let statField = dataFields[0]
            let modifierField = dataFields[1]

            statField.innerText = (classInfo["GrowthRates"][index] + selectedCharacterGrowthRates[index] + 15)
            modifierField.innerText = " (" + (classInfo["MaxStats"][index] + (index >= 1 && index <= 7 ?  selectedCharacterModifiers[index-1] : 0) + ")")

            average += Number((classInfo["GrowthRates"][index] + selectedCharacterGrowthRates[index] + 15))
        })

        allCells[allCells.length - 1].innerText = Math.floor(average / 9)
    })

/*    let stats = calculateStats(kidSelection, parentSelection, classSelection)
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
    })*/
}

let EngageFilter = () => {
    return (
        <div>
            <label>
                <button className="filterClassesDiv" onClick={filterClasses}>Filter Classes</button>
            </label>
        </div>
    )
}

let EngageSelect = ({options}) => {
    let [selectedValue, setSelectedValue] = useState('')

    let handleChange = (e) => {
        let value = e.target.value
        setSelectedValue(value)
        updateStats(value)
        // filterClasses()
    }

    return (
        <select className="unitSelectDropdown" value={selectedValue} onChange={handleChange}>
            <option key="default" value="default">Default</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}

let DropdownEngage = (props) => {
    let dropdownClassName = props.className
    let list = props.list.map(unitMap => [unitMap["Name"], ...unitMap["GrowthRates"]])

    let options = []
    list.forEach((option) =>{
        options.push({ label: option[0], value: option[0] })
    })

    return (
        <div className={dropdownClassName}>
            <EngageSelect options={options} />
            <EngageFilter />
        </div>
    )
}

export default DropdownEngage