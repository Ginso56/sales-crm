CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  period_start DATE,
  period_end DATE,
  target_calls INT,
  target_new_clients INT,
  target_shipments INT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_goals_user ON goals(user_id);
CREATE INDEX idx_goals_period ON goals(period_start, period_end);
