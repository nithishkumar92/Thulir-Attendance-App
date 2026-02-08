-- Update existing teams to have default roles if they have none
UPDATE teams
SET defined_roles = '[
  {"name": "Mason", "defaultWage": 800},
  {"name": "Helper", "defaultWage": 500},
  {"name": "Electrician", "defaultWage": 900},
  {"name": "Supervisor", "defaultWage": 1000}
]'::jsonb
WHERE defined_roles IS NULL OR defined_roles = '[]'::jsonb;
