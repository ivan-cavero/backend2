-- migrate:up
CREATE TABLE pricing_tiers (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
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
INSERT INTO pricing_tiers (name, description) VALUES
    ('Free', 'Free tier with basic features'),
    ('Early Adopter', 'Early adopter tier with premium features at a discounted price'),
    ('Pro', 'Professional tier with all features');

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

-- migrate:down
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
DROP TRIGGER IF EXISTS update_pricing_plans_updated_at ON pricing_plans;
DROP TRIGGER IF EXISTS update_subscription_types_updated_at ON subscription_types;
DROP TRIGGER IF EXISTS update_pricing_tiers_updated_at ON pricing_tiers;
DROP TABLE user_subscriptions;
DROP TABLE pricing_plans;
DROP TABLE subscription_types;
DROP TABLE pricing_tiers; 