CREATE DATABASE IF NOT EXISTS fleetbase_sandbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fleetbase_storefront CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `fleetbase\_sandbox`.* TO 'fleetbase'@'%';
GRANT ALL PRIVILEGES ON `fleetbase\_storefront`.* TO 'fleetbase'@'%';
