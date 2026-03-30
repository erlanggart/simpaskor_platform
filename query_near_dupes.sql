-- Find JURI near-duplicates with prefix patterns
SELECT a.id, a.name, a.email, b.id as dup_id, b.name as dup_name, b.email as dup_email
FROM users a
JOIN users b ON a.role = 'JURI' AND b.role = 'JURI' AND a.id < b.id
  AND (
    -- One name is a prefix variant of the other
    b.name = 'Pak ' || a.name OR a.name = 'Pak ' || b.name
    OR b.name = 'Kang ' || a.name OR a.name = 'Kang ' || b.name
    OR b.name = 'Ka ' || a.name OR a.name = 'Ka ' || b.name
    OR b.name = 'Bu ' || a.name OR a.name = 'Bu ' || b.name
    OR b.name = 'Teh ' || a.name OR a.name = 'Teh ' || b.name
    OR UPPER(a.name) = UPPER(b.name) AND a.name != b.name
  )
  AND a.name NOT IN (SELECT name FROM users GROUP BY name, role HAVING count(*) > 1)
  AND b.name NOT IN (SELECT name FROM users GROUP BY name, role HAVING count(*) > 1)
ORDER BY a.name;
