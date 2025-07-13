-- migrate:up
CREATE TABLE pricing_tiers (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    rate_limit INTEGER NOT NULL DEFAULT 100,
    api_key_limit INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_pricing_tiers_uuid_not_deleted 
    ON pricing_tiers (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_pricing_tiers_name_not_deleted 
    ON pricing_tiers (name) WHERE deleted_at IS NULL;

-- Insert default pricing tiers
INSERT INTO pricing_tiers (name, description, rate_limit, api_key_limit) VALUES
    ('Free', 'Free tier with basic features', 100, 3),
    ('Early Adopter', 'Early adopter tier with premium features at a discounted price', 500, 10),
    ('Pro', 'Professional tier with all features', 1000, 20);

CREATE TABLE subscription_types (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    duration_months INTEGER NOT NULL,
    is_lifetime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_subscription_types_uuid_not_deleted 
    ON subscription_types (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_subscription_types_name_not_deleted 
    ON subscription_types (name) WHERE deleted_at IS NULL;

-- Insert default subscription types
INSERT INTO subscription_types (name, duration_months, is_lifetime) VALUES
    ('Monthly', 1, FALSE),
    ('Annual', 12, FALSE),
    ('Lifetime', 0, TRUE);

CREATE TABLE pricing_plans (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    tier_id INTEGER NOT NULL,
    subscription_type_id INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (tier_id) REFERENCES pricing_tiers(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_type_id) REFERENCES subscription_types(id) ON DELETE CASCADE
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_pricing_plans_uuid_not_deleted 
    ON pricing_plans (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_pricing_plans_tier_subscription_not_deleted 
    ON pricing_plans (tier_id, subscription_type_id) WHERE deleted_at IS NULL;

CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES pricing_plans(id) ON DELETE CASCADE
);

-- Create unique partial indexes for soft delete support
CREATE UNIQUE INDEX unique_user_subscriptions_uuid_not_deleted 
    ON user_subscriptions (uuid) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX unique_user_subscriptions_user_plan_not_deleted 
    ON user_subscriptions (user_id, plan_id) WHERE deleted_at IS NULL;

-- Create triggers for updated_at columns
CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_types_updated_at BEFORE UPDATE ON subscription_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON pricing_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View to quickly fetch the active plan for a user (avoids repeating JOINs in code)
CREATE OR REPLACE VIEW active_user_plan AS
SELECT 
    u.uuid                 AS user_uuid,
    pt.name                AS tier_name,
    pt.rate_limit,
    pt.api_key_limit,
    us.starts_at,
    us.ends_at
FROM users u
LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.is_active = TRUE AND us.deleted_at IS NULL
LEFT JOIN pricing_plans pp ON pp.id = us.plan_id AND pp.deleted_at IS NULL
LEFT JOIN pricing_tiers pt ON pt.id = pp.tier_id AND pt.deleted_at IS NULL
WHERE u.deleted_at IS NULL;

-- migrate:down
DROP VIEW IF EXISTS active_user_plan;
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS update_pricing_plans_updated_at ON pricing_plans;
DROP TRIGGER IF EXISTS update_subscription_types_updated_at ON subscription_types;
DROP TRIGGER IF EXISTS update_pricing_tiers_updated_at ON pricing_tiers;
DROP TABLE user_subscriptions;
DROP TABLE pricing_plans;
DROP TABLE subscription_types;
DROP TABLE pricing_tiers; 