DROP TABLE IF EXISTS replies;
DROP TABLE IF EXISTS likes;
DROP TABLE IF EXISTS timeline;
DROP TABLE IF EXISTS follows;
DROP TABLE IF EXISTS tweets;
DROP TABLE IF EXISTS users;

-- USERS TABLE
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    follower_count INT DEFAULT 0,
    following_count INT DEFAULT 0
);

-- TWEETS TABLE
CREATE TABLE tweets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 280),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- FOLLOWS TABLE
CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followee_id)
);

-- TIMELINE CACHE TABLE (Optional)
CREATE TABLE timeline (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tweet_id BIGINT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tweet_id)
);

-- LIKES TABLE
CREATE TABLE likes (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tweet_id BIGINT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, tweet_id)
);

-- REPLIES TABLE
CREATE TABLE replies (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tweet_id BIGINT NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX idx_tweets_user_created ON tweets(user_id, created_at DESC);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_followee ON follows(followee_id);


INSERT INTO users (username, email, password_hash)
VALUES (
  'john_doe',
  'john@example.com',
  'hashed_password_example'
)
RETURNING *;
INSERT INTO users (username, email, password_hash)
VALUES (
  'marie',
  'marie@example.com',
  'hashed_password_example'
)
RETURNING *;
INSERT INTO users (username, email, password_hash)
VALUES (
  'simon',
  'simon@example.com',
  'hashed_password_example'
)
RETURNING *;
INSERT INTO users (username, email, password_hash)
VALUES (
  'petter_parker',
  'parker@example.com',
  'hashed_password_example'
)
RETURNING *;
INSERT INTO users (username, email, password_hash)
VALUES (
  'kevin_si',
  'kevin@example.com',
  'hashed_password_example'
)
RETURNING *;