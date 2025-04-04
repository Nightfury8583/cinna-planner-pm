import './css/App.css';
import './css/FireEmblem.css';
import React from "react";
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route,} from "react-router-dom";

import Home from "./pages/Home";
import Overwatch from "./pages/Overwatch";
import Awakening from "./pages/Awakening";
import Engage from "./pages/Engage";

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route exact path="/" element={<Home />} />
                <Route path="/overwatch" element={<Overwatch />} />
                <Route path="/awakening" element={<Awakening />} />
                <Route path="/engage" element={<Engage />} />
            </Routes>
        </Router>
    );
}

export default App;
