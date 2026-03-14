CREATE TABLE IF NOT EXISTS `m4j_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `date` varchar(255) DEFAULT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug_index` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `m4j_songs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `artist` varchar(255) NOT NULL,
  `genre` varchar(255) DEFAULT NULL,
  `lyrics` text,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`event_id`) REFERENCES `m4j_events`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `m4j_musicians` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `token` varchar(255) UNIQUE NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `m4j_selections` (
  `song_id` int(11) NOT NULL,
  `musician_id` int(11) NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`song_id`, `musician_id`, `role`),
  FOREIGN KEY (`song_id`) REFERENCES `m4j_songs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`musician_id`) REFERENCES `m4j_musicians`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `m4j_lineups` (
  `song_id` int(11) NOT NULL,
  `vocals_id` int(11) DEFAULT NULL,
  `rhythm_guitar_id` int(11) DEFAULT NULL,
  `lead_guitar_id` int(11) DEFAULT NULL,
  `bass_id` int(11) DEFAULT NULL,
  `drums_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`song_id`),
  FOREIGN KEY (`song_id`) REFERENCES `m4j_songs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vocals_id`) REFERENCES `m4j_musicians`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`rhythm_guitar_id`) REFERENCES `m4j_musicians`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`lead_guitar_id`) REFERENCES `m4j_musicians`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`bass_id`) REFERENCES `m4j_musicians`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`drums_id`) REFERENCES `m4j_musicians`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert your default generic initialization data here
INSERT IGNORE INTO `m4j_events` (`id`, `name`) VALUES (1, 'V1 PHP/React Jam');
