-- migrate:up
CREATE TABLE pricing_tiers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default pricing tiers
INSERT INTO pricing_tiers (id, name, description) VALUES
    (UUID(), 'Free', 'Free tier with basic features'),
    (UUID(), 'Early Adopter', 'Early adopter tier with premium features at a discounted price'),
    (UUID(), 'Pro', 'Professional tier with all features');

CREATE TABLE subscription_types (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    duration_months INT NOT NULL,
    is_lifetime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default subscription types
INSERT INTO subscription_types (id, name, duration_months, is_lifetime) VALUES
    (UUID(), 'Monthly', 1, FALSE),
    (UUID(), 'Annual', 12, FALSE),
    (UUID(), 'Lifetime', 0, TRUE);

CREATE TABLE pricing_plans (
    id VARCHAR(36) PRIMARY KEY,
    tier_id VARCHAR(36) NOT NULL,
    subscription_type_id VARCHAR(36) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tier_id) REFERENCES pricing_tiers(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_type_id) REFERENCES subscription_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tier_subscription (tier_id, subscription_type_id)
);

CREATE TABLE user_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    plan_id VARCHAR(36) NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES pricing_plans(id) ON DELETE CASCADE
);

-- migrate:down
DROP TABLE user_subscriptions;
DROP TABLE pricing_plans;
DROP TABLE subscription_types;
DROP TABLE pricing_tiers;
