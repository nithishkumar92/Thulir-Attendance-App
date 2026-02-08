-- Set the database timezone to IST
ALTER DATABASE postgres SET timezone TO 'Asia/Kolkata';

-- If you want specific columns to be stored as 'Local Time' (without time zone) 
-- effectively forcing them to look like IST in the DB, you would need to alter them.
-- BUT, the 'ALTER DATABASE' command above is the correct way to handle this globally.
