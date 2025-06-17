-- migrate:up
-- Create providers table to ensure consistent provider names
CREATE TABLE providers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_name_not_deleted (name, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

-- Insert initial providers
INSERT INTO providers (uuid, name, display_name) VALUES
    (UUID(), 'google', 'Google'),
    (UUID(), 'github', 'GitHub'),
    (UUID(), 'email', 'Email/Password');

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    api_key VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_email_not_deleted (email, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_api_key_not_deleted (api_key, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

-- Identities table to link users with different authentication providers
CREATE TABLE identities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    provider_id INT NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_provider_user_not_deleted (provider_id, provider_user_id, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

-- Refresh table for multiple sessions per user (max 5)
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_token_not_deleted (token, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    INDEX idx_user_id (user_id)
);

-- API Keys table for user programmatic access
CREATE TABLE api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    label VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    INDEX idx_user_id (user_id)
);

-- migrate:down
DROP TABLE api_keys;
DROP TABLE refresh_tokens;
DROP TABLE identities;
DROP TABLE users;
DROP TABLE providers;
