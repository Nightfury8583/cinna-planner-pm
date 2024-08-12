const semesterClasses = [
    {title: "World History to Circa 1600", courseType: "HST", creditHours: 3, id: 1},
    {title: "Introduction to CyberSecurity", courseType: "CSC", creditHours: 3, id: 2},
    {title: "Introduction to DataBases", courseType: "CSC", creditHours: 3, id: 3},
    {title: "Elementary Italian", courseType: "ITL", creditHours: 3, id: 4},
    {title: "Introduction to Java Programming", courseType: "ITC", creditHours: 3, id: 5}
]

function switchStatement(courseType) {
    switch (courseType) {
        case 'HST':
            return 'blue';
        case 'CSC':
            return 'orange';
        case 'ITL':
            return 'green';
        case 'ITC':
            return 'purple';
        default:
            return 'black'
    }
}

function SillyButton() {
    function handleCLick() {
        alert('Tehe!');
    }

    return (
        <>
            <button onClick={handleCLick}> Silly Button</button>
        </>
    );
}

function Home() {
    const listItems = semesterClasses.map(semesterClass =>
        <li
            key={semesterClass.id}
            style={{
                color: switchStatement(semesterClass.courseType)
            }}
        >
            {semesterClass.title}
        </li>
    );
    return (
        <div>
            <SillyButton/>
            <ul>{listItems}</ul>
        </div>
    );
}

export default Home;