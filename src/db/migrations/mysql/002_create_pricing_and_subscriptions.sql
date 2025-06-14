-- migrate:up
CREATE TABLE pricing_tiers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_name_not_deleted (name, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

-- Insert default pricing tiers
INSERT INTO pricing_tiers (uuid, name, description) VALUES
    (UUID(), 'Free', 'Free tier with basic features'),
    (UUID(), 'Early Adopter', 'Early adopter tier with premium features at a discounted price'),
    (UUID(), 'Pro', 'Professional tier with all features');

CREATE TABLE subscription_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    duration_months INT NOT NULL,
    is_lifetime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_name_not_deleted (name, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

-- Insert default subscription types
INSERT INTO subscription_types (uuid, name, duration_months, is_lifetime) VALUES
    (UUID(), 'Monthly', 1, FALSE),
    (UUID(), 'Annual', 12, FALSE),
    (UUID(), 'Lifetime', 0, TRUE);

CREATE TABLE pricing_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    tier_id INT NOT NULL,
    subscription_type_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (tier_id) REFERENCES pricing_tiers(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_type_id) REFERENCES subscription_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_tier_subscription_not_deleted (tier_id, subscription_type_id, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

CREATE TABLE user_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES pricing_plans(id) ON DELETE CASCADE,
    UNIQUE KEY unique_uuid_not_deleted (uuid, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END)),
    UNIQUE KEY unique_user_plan_not_deleted (user_id, plan_id, (CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END))
);

-- migrate:down
DROP TABLE user_subscriptions;
DROP TABLE pricing_plans;
DROP TABLE subscription_types;
DROP TABLE pricing_tiers;
