import React, {useState} from 'react'
import {ClassMap} from '../utils/AwakeningClasses.js'
import {Fathers, Kids, Mothers, StaticParents, UnitMap} from '../utils/AwakeningUnits.js'
import DropdownFE from "../components/DropdownFE";

let KidsArray = Object.values(Kids);
let FatherArray = Object.values(Fathers);
let MotherArray = Object.values(Mothers);
let ClassList = Object.values(ClassMap);

const TableV1 = () => {
    let lucina = KidsArray[0];

    return (
        <div className="feContainer">
            <table>
                <thead>
                <tr>
                    <th>Kid</th>
                    <th>Parent</th>
                    <th>Class</th>
                    <th>HP</th>
                    <th>Str</th>
                    <th>Mag</th>
                    <th>Skl</th>
                    <th>Spd</th>
                    <th>Lck</th>
                    <th>Def</th>
                    <th>Res</th>
                    <th>Avg</th>
                </tr>
                </thead>
                <tbody>
                <tr key={lucina["Name"]}>
                    <td>{lucina["Name"]}</td>
                    <td><DropdownFE className={lucina["Name"]} list={MotherArray}/></td>
                    <td><DropdownFE className={`${lucina["Name"]}Classes`} list={ClassList}/></td>
                    {lucina["GrowthRates"].map((stat, index) => (
                        <td key={lucina[0]+index}>
                            <span className="stat">{stat}</span>
                            <span className="modifier"></span>
                        </td>
                    ))}
                    <td>
                        <span className="stat">{Math.floor(lucina["GrowthRates"].reduce((acc, curr) => acc + curr, 0) / lucina["GrowthRates"].length)}</span>
                        <span className="modifier"></span>
                    </td>
                </tr>
                {KidsArray.slice(1).map((kid) => (
                    <tr key={kid["Name"]}>
                        <td>{kid["Name"]}</td>
                        <td><DropdownFE className={kid["Name"]} list={FatherArray}/></td>
                        <td><DropdownFE className={`${kid["Name"]}Classes`} list={ClassList}/></td>
                        {kid["GrowthRates"].map((stat, index) => (
                            <td key={kid[0]+index}>
                                <span className="stat">{stat}</span>
                                <span className="modifier"></span>
                            </td>
                        ))}
                        <td>
                            <span className="stat">{Math.floor(kid["GrowthRates"].reduce((acc, curr) => acc + curr, 0) / kid["GrowthRates"].length)}</span>
                            <span className="modifier"></span>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
};

function Awakening() {
    return (
        <TableV1/>
    )
}

export default Awakening 