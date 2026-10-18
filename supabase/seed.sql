-- Placeholder teams (8 teams across 3 levels). Rename to the real team names.
insert into public.teams (name, level) values
  ('Top A', 'top'),
  ('Top B', 'top'),
  ('Top C', 'top'),
  ('Bottom A', 'bottom'),
  ('Bottom B', 'bottom'),
  ('Bottom C', 'bottom'),
  ('Reserve A', 'reserve'),
  ('Reserve B', 'reserve')
on conflict (name) do nothing;
