function Navbar() {
    return (
        <div>
            <nav>
                <ul className="menu">
                    <li><a href="/">Home</a></li>
                    {/*<li><a href="/overwatch">Overwatch</a></li>*/}
                    <li><a href="/awakening">Awakening</a></li>
                    <li><a href="/engage">Engage</a></li>
                </ul>
            </nav>
        </div>
    );
}

export default Navbar;