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

-- Create roles table for user permissions and access control
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_roles_uuid_not_deleted 
    ON roles (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_roles_name_not_deleted 
    ON roles (name) WHERE deleted_at IS NULL;

-- Insert initial roles
INSERT INTO roles (name, display_name, description, is_default) VALUES
    ('user', 'User', 'Standard user with basic permissions', TRUE),
    ('admin', 'Administrator', 'Full system access and user management', FALSE),
    ('manager', 'Manager', 'Management access with limited admin privileges', FALSE),
    ('moderator', 'Moderator', 'Content moderation and user support privileges', FALSE);

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

-- User roles junction table for many-to-many relationship between users and roles
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_by INTEGER, -- ID of user who assigned this role (optional)
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL, -- Optional expiration for temporary roles
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_user_roles_uuid_not_deleted 
    ON user_roles (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_user_roles_user_role_not_deleted 
    ON user_roles (user_id, role_id) WHERE deleted_at IS NULL;

-- Create indexes for efficient queries
CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
CREATE INDEX idx_user_roles_expires_at ON user_roles (expires_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to automatically assign default role to new users
CREATE OR REPLACE FUNCTION assign_default_role_to_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role_id INTEGER;
BEGIN
    -- Get the default role ID
    SELECT id INTO default_role_id 
    FROM roles 
    WHERE is_default = TRUE AND deleted_at IS NULL 
    LIMIT 1;
    
    -- If a default role exists, assign it to the new user
    IF default_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, assigned_at)
        VALUES (NEW.id, default_role_id, CURRENT_TIMESTAMP);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically assign default role to new users
CREATE TRIGGER assign_default_role_trigger AFTER INSERT ON users 
    FOR EACH ROW EXECUTE FUNCTION assign_default_role_to_user();

-- Create view for easy role queries with user information
CREATE VIEW user_roles_view AS
SELECT 
    u.uuid as user_uuid,
    u.email,
    u.name as user_name,
    r.uuid as role_uuid,
    r.name as role_name,
    r.display_name as role_display_name,
    r.description as role_description,
    ur.assigned_at,
    ur.expires_at,
    CASE 
        WHEN ur.expires_at IS NULL THEN true
        WHEN ur.expires_at > CURRENT_TIMESTAMP THEN true
        ELSE false
    END as is_active,
    CASE WHEN ur.assigned_by IS NOT NULL THEN ab.uuid ELSE NULL END as assigned_by_uuid,
    CASE WHEN ur.assigned_by IS NOT NULL THEN ab.email ELSE NULL END as assigned_by_email
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
LEFT JOIN users ab ON ur.assigned_by = ab.id
WHERE u.deleted_at IS NULL 
  AND ur.deleted_at IS NULL 
  AND r.deleted_at IS NULL;

-- migrate:down
DROP VIEW IF EXISTS user_roles_view;
DROP TRIGGER IF EXISTS assign_default_role_trigger ON users;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
DROP TRIGGER IF EXISTS update_identities_updated_at ON identities;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_providers_updated_at ON providers;
DROP FUNCTION IF EXISTS assign_default_role_to_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE user_roles;
DROP TABLE api_keys;
DROP TABLE refresh_tokens;
DROP TABLE identities;
DROP TABLE users;
DROP TABLE roles;
DROP TABLE providers; 