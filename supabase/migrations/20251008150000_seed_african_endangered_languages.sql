-- Migration to seed 8 African endangered languages
-- Based on web research conducted on 2025-10-08

-- Insert African endangered languages into the languages table
-- Note: The current languages table only has basic columns (id, name, code, created_at)
-- We'll insert the basic language information first

INSERT INTO languages (name, code) VALUES 
('Korandje', 'kcy'),
('Tidikelt', 'tia'),
('Tchumbuli', 'bqa'),
('Kua', 'tyu'),
('Taa', 'nmn'),
('Yeyi', 'yey'),
('Xaise', NULL),
('Akum', 'aku');