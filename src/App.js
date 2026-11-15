import './css/App.css';
import './css/FireEmblem.css';
import './css/FF13.css';
import React from "react";
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Overwatch from "./pages/Overwatch";
import Awakening from "./pages/Awakening";
import Engage from "./pages/Engage";
import FF13 from "./pages/FF13";

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Navigate to="/ff13" replace />} />
                <Route path="/overwatch" element={<Overwatch />} />
                <Route path="/awakening" element={<Awakening />} />
                <Route path="/engage" element={<Engage />} />
                <Route path="/ff13" element={<FF13 />} />
            </Routes>
        </Router>
    );
}

export default App;
