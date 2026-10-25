-- Development-only sample data. Run only against a local or disposable project.
-- These are fictional records, not real prospects.

insert into public.calls (title, prospect_name, company, prospect_role, status, current_stage, final_outcome, completed_at)
values
  ('Kalyx Enterprises - growth report follow-up', 'Senthil', 'Kalyx Enterprises', 'Director', 'completed', 'close', 'next_step_agreed', now() - interval '1 day'),
  ('Lotus Skin Clinic - switchboard', 'Reception', 'Lotus Skin Clinic', null, 'completed', 'close', 'follow_up', now() - interval '2 days'),
  ('Aerolink Signal Systems - wrong contact', 'Unknown', 'Aerolink Signal Systems', 'Director, Strategic Marketing', 'completed', 'close', 'wrong_person', now() - interval '3 days')
on conflict do nothing;

insert into public.call_stage_results (call_id, stage_id, stage_order, prospect_statement, what_happened, stage_outcome)
select id, 'their_need', 5, 'We want to push the new product line into two more states this year.', 'Named the goal without prompting.', 'need_named'
from public.calls where title = 'Kalyx Enterprises - growth report follow-up'
on conflict (call_id, stage_id) do nothing;
