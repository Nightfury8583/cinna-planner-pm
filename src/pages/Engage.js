import React, {useState} from 'react'
import {ClassMap} from '../utils/AwakeningClasses.js'
import {Fathers, Kids, Mothers, StaticParents, UnitMap} from '../utils/AwakeningUnits.js'
import DropdownFE from "../components/DropdownFE";
import {EngageClassMap} from "../utils/EngageClasses";
import DropdownEngage from "../components/DropdownEngage";
import {EngageUnits} from "../utils/EngageUnits";

let ClassList = Object.values(EngageClassMap);
let UnitList = Object.values(EngageUnits)

const EngageStateTable = () => {
    return (
        <div className="feEngageContainer">
            <div className="unitSelectDiv">
                <DropdownEngage className="unitSelectDropdownDiv" list={UnitList}/>
            </div>
                <table className="engageTable">
                    <thead>
                    <tr>
                        <th>Class</th>
                        <th>HP</th>
                        <th>Str</th>
                        <th>Mag</th>
                        <th>Dex</th>
                        <th>Spd</th>
                        <th>Def</th>
                        <th>Res</th>
                        <th>Lck</th>
                        <th>Bld</th>
                        <th>Avg</th>
                    </tr>
                    </thead>
                    <tbody>
                    {ClassList.map((clazz) => (
                        <tr key={clazz["Name"]}>
                            <td>
                                <input type="checkbox" id={clazz["Name"]} name={clazz["Name"]} value={clazz["Name"]}/>
                                {clazz["Name"]}
                            </td>
                            {clazz["GrowthRates"].map((stat, index) => (
                                <td key={clazz[0]+index}>
                                    <span className="engageStat">{stat}</span>
                                    <span className="engageModifier"></span>
                                </td>
                            ))}
                            <td>
                                <span className="stat">{Math.floor(clazz["GrowthRates"].reduce((acc, curr) => acc + curr, 0) / clazz["GrowthRates"].length)}</span>
                                <span className="modifier"></span>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
        </div>
    )
};

function Engage() {
    return (
        <EngageStateTable/>
    )
}

export default Engage