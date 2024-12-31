import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Collection from './pages/Collection';
import './styles/App.css';

const App = () => {
    const userId = localStorage.getItem('userId');

    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/collection" element={<Collection userId={userId} />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
