CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  salesman_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('answered', 'no_answer', 'scheduled', 'callback')),
  called_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  duration_seconds INT,
  shipment_count INT,
  shipment_destinations TEXT[],
  shipping_company VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scheduled_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  assigned_to UUID REFERENCES users(id),
  scheduled_by UUID REFERENCES users(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_call_logs_company ON call_logs(company_id);
CREATE INDEX idx_call_logs_salesman ON call_logs(salesman_id);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_call_logs_called_at ON call_logs(called_at);
CREATE INDEX idx_scheduled_assigned ON scheduled_calls(assigned_to);
CREATE INDEX idx_scheduled_for ON scheduled_calls(scheduled_for);
CREATE INDEX idx_scheduled_status ON scheduled_calls(status);
