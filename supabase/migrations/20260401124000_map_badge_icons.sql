UPDATE public.badges
SET icon_url = CASE name
  WHEN 'First Purchase' THEN 'badge-icons/Asset 31.svg'
  WHEN 'Regular Shopper' THEN 'badge-icons/Asset 34.svg'
  WHEN 'Loyal Customer' THEN 'badge-icons/Asset 2.svg'
  WHEN 'Super Loyal' THEN 'badge-icons/Asset 24.svg'
  WHEN 'Elite Member' THEN 'badge-icons/Asset 14.svg'
  WHEN 'Big Spender' THEN 'badge-icons/Asset 18.svg'
  WHEN 'Premium Spender' THEN 'badge-icons/Asset 10.svg'
  WHEN 'Explorer' THEN 'badge-icons/Asset 16.svg'
  WHEN 'World Traveler' THEN 'badge-icons/Asset 11.svg'
  WHEN 'Points Collector' THEN 'badge-icons/Asset 15.svg'
  WHEN 'Points Master' THEN 'badge-icons/Asset 7.svg'
  WHEN 'Veteran Member' THEN 'badge-icons/Asset 12.svg'
  ELSE icon_url
END
WHERE name IN (
  'First Purchase',
  'Regular Shopper',
  'Loyal Customer',
  'Super Loyal',
  'Elite Member',
  'Big Spender',
  'Premium Spender',
  'Explorer',
  'World Traveler',
  'Points Collector',
  'Points Master',
  'Veteran Member'
);
