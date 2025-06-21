-- migrate:up
-- Create providers table to ensure consistent provider names
CREATE TABLE providers (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_providers_uuid_not_deleted 
    ON providers (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_providers_name_not_deleted 
    ON providers (name) WHERE deleted_at IS NULL;

-- Insert initial providers
INSERT INTO providers (name, display_name) VALUES
    ('google', 'Google'),
    ('github', 'GitHub'),
    ('email', 'Email/Password');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_users_uuid_not_deleted 
    ON users (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_users_email_not_deleted 
    ON users (email) WHERE deleted_at IS NULL;

-- Identities table to link users with different authentication providers
CREATE TABLE identities (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_identities_uuid_not_deleted 
    ON identities (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_identities_provider_user_not_deleted 
    ON identities (provider_id, provider_user_id) WHERE deleted_at IS NULL;

-- Refresh table for multiple sessions per user (max 5)
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    token VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique partial index and regular index
CREATE UNIQUE INDEX unique_refresh_tokens_token_not_deleted 
    ON refresh_tokens (token) WHERE deleted_at IS NULL;
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- API Keys table for user programmatic access
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    label VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create unique partial index and regular index
CREATE UNIQUE INDEX unique_api_keys_uuid_not_deleted 
    ON api_keys (uuid) WHERE deleted_at IS NULL;
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- migrate:down
DROP TRIGGER IF EXISTS update_identities_updated_at ON identities;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_providers_updated_at ON providers;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE api_keys;
DROP TABLE refresh_tokens;
DROP TABLE identities;
DROP TABLE users;
DROP TABLE providers; 