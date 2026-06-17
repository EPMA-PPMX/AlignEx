DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM resources WHERE email = 'parthiv.bhuta@epmainc.com') THEN
    INSERT INTO resources (first_name, last_name, resource_name, email, resource_type, status)
    VALUES ('Parthiv', 'Bhuta', 'Parthiv Bhuta', 'parthiv.bhuta@epmainc.com', 'person', 'active');
  END IF;
END $$;
