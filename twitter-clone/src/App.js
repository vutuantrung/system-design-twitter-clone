// Sample React frontend (App.js)
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { CLOSING } from 'ws';

const API = 'http://localhost:3000';

function App() {
    const consumerWS = useRef(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [token, setToken] = useState(null);
    const [userId, setUserId] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [content, setContent] = useState('');
    const [loginError, setLoginError] = useState(null);
    const [followId, setFollowId] = useState('');

    useEffect(() => {
        if (loginError) {
            const timer = setTimeout(() => setLoginError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [loginError]);

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
      body {
        background-color: #000;
        color: white;
      }
      .container {
        max-width: 600px;
        margin: auto;
        font-family: sans-serif;
        padding: 2rem;
      }
      .input {
        display: block;
        width: 100%;
        margin: 0.5rem 0;
        padding: 0.5rem;
        font-size: 1rem;
        background: #1a1a1a;
        color: white;
        border: 1px solid #333;
      }
      .button {
        padding: 0.6rem 1.2rem;
        background: #1da1f2;
        color: white;
        border: none;
        margin-top: 0.5rem;
        cursor: pointer;
        border-radius: 4px;
      }
      .auth-box, .main-box {
        background: #1a1a1a;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(255,255,255,0.05);
      }
      .timeline {
        list-style: none;
        padding: 0;
      }
      .tweet {
        background: #111;
        border: 1px solid #333;
        padding: 0.8rem;
        margin-bottom: 0.5rem;
        border-radius: 6px;
        color: white;
        position: relative;
      }
      .username {
        position: absolute;
        top: 0.5rem;
        right: 0.8rem;
        font-size: 0.8rem;
        color: #aaa;
      }
      .link {
        color: #1da1f2;
        cursor: pointer;
        text-decoration: underline;
      }
      .tweet-buttons {
        display: flex;
        gap: 10px;
        margin-top: 0.5rem;
      }
      .error {
        color: #ff4d4f;
        margin-top: 0.5rem;
      }
    `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    useEffect(() => {
        console.log("useEffect userId", userId)
        if (!userId) return;

        const socket = new WebSocket(`ws://localhost:8081/?userId=${userId}`);
        socket.onopen = (event) => {
            console.log("ws consumer is connected")
        }
        socket.onmessage = (event) => {
            const newTweet = JSON.parse(event.data);
            console.log('Live Tweet:', newTweet);
            setTimeline(prev => [newTweet, ...prev]);
        };

        socket.onerror = (err) => console.error('WebSocket error:', err);

        return () => socket.close();
    }, [userId]);

    const login = async () => {
        try {
            console.log("login")
            const res = await axios.post(`${API}/auth/login`, { email, password });
            setToken(res.data.token);
            setLoginError(null);
            const decoded = JSON.parse(atob(res.data.token.split('.')[1]));
            console.log(decoded.id)
            setUserId(decoded.id);
            loadTimeline(decoded.id, res.data.token);
        } catch (err) {
            setLoginError('Invalid email or password');
        }
    };

    const logout = () => {
        setToken(null);
        setUserId(null);
        setTimeline([]);
        setContent('');
        setFollowId('');
    };

    const register = async () => {
        await axios.post(`${API}/auth/register`, { username, email, password });
        setIsRegister(false);
        setUsername('');
        setEmail('');
        setPassword('');
    };

    const loadTimeline = async (uid, jwt) => {
        const res = await axios.get(`${API}/tweets/feed/${uid}`, {
            headers: { Authorization: `Bearer ${jwt}` },
        });
        setTimeline(res.data);
    };

    const postTweet = async () => {
        const res = await axios.post(
            `${API}/tweets`,
            { content },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setContent('');
        setTimeline((prev) => [res.data, ...prev]);
    };

    const followUser = async () => {
        await axios.post(
            `${API}/follow`,
            { followee_id: followId },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setFollowId('');
        loadTimeline(userId, token);
    };

    return (
        <div className="container">
            {!token && (
                <div className="auth-box">
                    <h2>{isRegister ? 'Register' : 'Login'}</h2>
                    {isRegister && (
                        <input
                            className="input"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    )}
                    <input
                        className="input"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        className="input"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {loginError && !isRegister && (
                        <div className="error">❌ {loginError}</div>
                    )}
                    {isRegister ? (
                        <button className="button" onClick={register}>Register</button>
                    ) : (
                        <button className="button" onClick={login}>Login</button>
                    )}
                    <p>
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <span className="link" onClick={() => {
                            setIsRegister(!isRegister);
                            setLoginError(null);
                        }}>
                            {isRegister ? 'Login' : 'Register'}
                        </span>
                    </p>
                </div>
            )}

            {token && (
                <div className="main-box">
                    <button className="button" onClick={logout} style={{ float: 'right', marginBottom: '1rem' }}>Logout</button>
                    <h2>Post Tweet</h2>
                    <textarea
                        className="input"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's happening?"
                    />
                    <button className="button" onClick={postTweet}>Tweet</button>

                    <h2>Follow User</h2>
                    <input
                        className="input"
                        placeholder="User ID to follow"
                        value={followId}
                        onChange={(e) => setFollowId(e.target.value)}
                    />
                    <button className="button" onClick={followUser}>Follow</button>

                    <h2>Timeline</h2>
                    <ul className="timeline">
                        {timeline.map((t) => (
                            <li key={t.id} className="tweet">
                                {t.content}
                                <div className="username">@{t.username}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default App;
