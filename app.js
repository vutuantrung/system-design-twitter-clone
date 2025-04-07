// Sample React frontend (App.js)
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:3000';

function App() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState(null);
    const [content, setContent] = useState('');
    const [timeline, setTimeline] = useState([]);
    const [userId, setUserId] = useState(null);

    const login = async () => {
        const res = await axios.post(`${API}/auth/login`, { email, password });
        setToken(res.data.token);
        const decoded = JSON.parse(atob(res.data.token.split('.')[1]));
        setUserId(decoded.id);
        loadTimeline(decoded.id, res.data.token);
    };

    const postTweet = async () => {
        await axios.post(
            `${API}/tweets`,
            { content },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setContent('');
        loadTimeline(userId, token);
    };

    const loadTimeline = async (uid, jwt) => {
        const res = await axios.get(`${API}/timeline/${uid}`, {
            headers: { Authorization: `Bearer ${jwt}` },
        });
        setTimeline(res.data);
    };

    return (
        <div style={{ padding: 20 }}>
            <h2>Login</h2>
            <input placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
            <input
                type="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={login}>Login</button>

            {token && (
                <>
                    <h2>Post Tweet</h2>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's happening?"
                    />
                    <button onClick={postTweet}>Tweet</button>

                    <h2>Timeline</h2>
                    <ul>
                        {timeline.map((t) => (
                            <li key={t.id}>{t.content}</li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

export default App;
