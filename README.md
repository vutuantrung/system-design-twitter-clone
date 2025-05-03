# 🐦 Twitter Clone Project – Technology Stack Summary

## 🖥️ Frontend
- **React.js**: UI framework for rendering the timeline, tweets, login/register forms
- **WebSocket**: Real-time updates of tweets sent to followers’ timelines
- **Inline CSS**: For basic layout and styling within the component files

## 🌐 Backend (API Server)
- **Node.js + Express.js**: REST API endpoints for tweets, follow/unfollow, authentication
- **PostgreSQL**: SQL database for users, tweets, and follow relationships
- **Redis**: In-memory cache for:
  - Tweets: `tweet:{id}`
  - Followers list: `followers:{userId}`
- **KafkaJS (Kafka Producer)**: Sends tweet messages to Kafka topic `tweets`

## 🔁 Realtime Processing Layer
- **Apache Kafka**:
  - **Topic**: `tweets`
  - **Producer**: Express API emits tweet messages
  - **Consumer**: Node.js service listens for new tweets and distributes them via WebSocket
- **KafkaJS (Kafka Consumer)**: Receives tweet events, looks up followers (cached), and pushes tweet to connected users

## 🧠 Caching Strategy
- **Redis**:
  - Cached on tweet publish (by tweet ID)
  - Cached on first DB fetch of followers
  - Invalidation occurs on follow/unfollow API events

## 🧩 Infrastructure
- **Docker Compose**:
  - PostgreSQL container (port: 5432)
  - Redis container (custom port: 9092)
  - Kafka + Zookeeper containers

## ⚙️ Architectural Flow
1. Frontend calls `POST /tweets`
2. Express API saves to PostgreSQL, caches tweet, sends to Kafka
3. Kafka Consumer pulls tweet, looks up (cached) followers
4. Sends tweet to all followers via WebSocket
5. Frontend receives real-time tweet and updates timeline

---

Let me know if you want this exported to a standalone `README.md` or attached to your project repo!
