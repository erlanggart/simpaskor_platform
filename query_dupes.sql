SELECT u.id, u.name, u.email, u.role,
  (SELECT count(*) FROM jury_event_assignments j WHERE j.jury_id = u.id) as jury_assigns,
  (SELECT count(*) FROM evaluations e WHERE e.jury_id = u.id) as evals,
  (SELECT count(*) FROM event_participations ep WHERE ep.user_id = u.id) as participations,
  (SELECT count(*) FROM events ev WHERE ev.created_by_id = u.id) as events_created
FROM users u
WHERE u.name IN (
  SELECT name FROM users GROUP BY name, role HAVING count(*) > 1
)
ORDER BY u.role, u.name, u.created_at;
