CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  address TEXT,
  country VARCHAR(100),
  industry VARCHAR(100),
  status VARCHAR(30) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'not_interested', 'closed')),
  assigned_to UUID REFERENCES users(id),
  priority_followup BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_assigned ON companies(assigned_to);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_country ON companies(country);
