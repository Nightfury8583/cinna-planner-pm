import {philipsHeroes} from '../utils/Images.js';
import {mikeysHeroes} from '../utils/Images.js';
import {kevinsHeroes} from '../utils/Images.js';
import {controlMaps} from '../utils/Images.js';

const displayPhilipsHeroes = () => {
    clearHeroes()
    setAllHeroes(philipsHeroes)
};

const displayMikeysHeroes = () => {
    clearHeroes()
    let heroesDiv = document.querySelector('.supports');
    let img = document.createElement('img');
    img.setAttribute("className", "hero")
    img.src = mikeysHeroes.moira; // Set the path to your image
    heroesDiv.appendChild(img);
};

const displayKevinsHeroes = () => {
    clearHeroes()
    let heroesDiv = document.querySelector('.tanks');
    let img = document.createElement('img');
    img.setAttribute("className", "hero")
    img.src = kevinsHeroes.dva; // Set the path to your image
    heroesDiv.appendChild(img);
};

const setAllHeroes = (heroPool) => {
    clearHeroes()

    let tanks = heroPool[0]
    let dps = heroPool[1]
    let supports = heroPool[2]

    const tanksDiv = document.querySelector('.tanks');
    const dpsDiv = document.querySelector('.dps');
    const supportsDiv = document.querySelector('.supports');

    tanks.forEach(hero => {
        const img = document.createElement('img');
        img.setAttribute("className", "hero")
        img.src = hero;
        tanksDiv.appendChild(img);
    })

    dps.forEach(hero => {
        const img = document.createElement('img');
        img.setAttribute("className", "hero")
        img.src = hero;
        dpsDiv.appendChild(img);
    })

    supports.forEach(hero => {
        const img = document.createElement('img');
        img.setAttribute("className", "hero")
        img.src = hero;
        supportsDiv.appendChild(img);
    })

    //Formatting
    document.querySelector('.heroes').classList.add('expanded');
}

const clearHeroes = () => {
    const tankDiv = document.querySelector('.tanks');
    const dpsDiv = document.querySelector('.dps');
    const supportDiv = document.querySelector('.supports');
    tankDiv.innerHTML = '';
    dpsDiv.innerHTML = '';
    supportDiv.innerHTML = '';
}

const displayControlMaps = () => {
    const mapsDiv = document.querySelector('.mapSelection');
    mapsDiv.setAttribute('style', 'display: none;');
    const controlMapsDiv = document.querySelector('.maps');
    controlMapsDiv.setAttribute('style', 'display: flex;');
    controlMapsDiv.style.width = "545px"


    controlMaps.forEach(map => {
        const button = document.createElement('button')
        button.addEventListener("click", displayMikeysHeroes);
        button.setAttribute("className", "phantom")

        const img = document.createElement('img');
        img.setAttribute("className", "controlMap")
        img.src = map; // Set the path to your image

        button.appendChild(img)
        controlMapsDiv.appendChild(button);
    })
}

function Overwatch() {
    return (
        <div className="overwatchContainer">
            <div className="heroes">
                <div className="tanksContainer">
                    <h2>Tanks</h2>
                    <div className="tanks">

                    </div>
                </div>
                <div className="dpsContainer">
                    <h2>DPS</h2>
                    <div className="dps">

                    </div>

                </div>
                <div className="supportsContainer">
                    <h2>Supports</h2>
                    <div className="supports">

                    </div>
                </div>
            </div>
            <div className="buttonsTest">
                <div className="buttons">
                    <div className="players">
                        <button className="button-64" onClick={displayPhilipsHeroes}>
                            <span className="text">Philip</span>
                        </button>
                        <button className="button-64" onClick={displayMikeysHeroes}>
                            <span className="text">Mikey</span>
                        </button>
                        <button className="button-64" onClick={displayKevinsHeroes}>
                            <span className="text">KTaco</span>
                        </button>
                    </div>
                    <div className="mapSelection">
                        <button className="button-78" onClick={displayControlMaps}>
                            <span className="text">Control</span>
                        </button>
                        <button className="button-78" onClick={displayMikeysHeroes}>
                            <span className="text">Hybrid</span>
                        </button>
                        <button className="button-78" onClick={displayKevinsHeroes}>
                            <span className="text">Push</span>
                        </button>
                        <button className="button-78" onClick={displayKevinsHeroes}>
                            <span className="text">Escort</span>
                        </button>
                    </div>
                    <div className="maps" style={{display: 'none'}}>

                    </div>
                    <div className="counterHero">
                        <button className="button-46" onClick={displayPhilipsHeroes}>
                            <span className="text">Sombra</span>
                        </button>
                        <button className="button-46" onClick={displayMikeysHeroes}>
                            <span className="text">Pharah</span>
                        </button>
                        <button className="button-46" onClick={displayKevinsHeroes}>
                            <span className="text">Orisa</span>
                        </button>
                        <button className="button-46" onClick={displayKevinsHeroes}>
                            <span className="text">Doomfist</span>
                        </button>
                    </div>
                </div>
                <div className="resetDiv">
                    <button className="button-82-pushable" role="button" onClick={() => window.location.reload()}>
                        <span className="button-82-shadow"></span>
                        <span className="button-82-edge"></span>
                        <span className="button-82-front text">
                                   Reset
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Overwatch;