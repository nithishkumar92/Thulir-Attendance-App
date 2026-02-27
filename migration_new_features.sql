-- 1. VENDORS
CREATE TABLE vendors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  gst_number  TEXT,
  category    TEXT CHECK (category IN (
                'material', 'labour_contractor', 'equipment', 'other'
              )) DEFAULT 'material',
  address     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MATERIAL MASTER
CREATE TABLE material_master (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN (
               'sand', 'cement', 'steel', 'pipe', 'fitting',
               'tile', 'electrical', 'equipment', 'other'
             )),
  unit       TEXT NOT NULL,
  is_tile    BOOLEAN DEFAULT FALSE,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TILE MASTER
CREATE TABLE tile_master (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id     UUID REFERENCES material_master(id),
  brand           TEXT,
  size_mm         INTEGER NOT NULL,
  size_label      TEXT,
  type            TEXT CHECK (type IN (
                    'vitrified', 'ceramic', 'gvt',
                    'double_charge', 'parking', 'anti_skid', 'mosaic'
                  )),
  colour          TEXT,
  finish          TEXT,
  rate_per_sqft   NUMERIC(10,2),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. EXPENSES
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id         UUID REFERENCES sites(id) NOT NULL,
  date            DATE NOT NULL,
  type            TEXT NOT NULL CHECK (type IN (
                    'material_invoice', 'material_cash', 'labour_contractor',
                    'petty_cash', 'equipment_hire'
                  )),
  vendor_id       UUID REFERENCES vendors(id),
  invoice_number  TEXT,
  invoice_date    DATE,
  total_amount    NUMERIC(12,2) NOT NULL,
  gst_amount      NUMERIC(10,2) DEFAULT 0,
  paid_amount     NUMERIC(12,2) DEFAULT 0,
  payment_status  TEXT DEFAULT 'unpaid' CHECK (
                    payment_status IN ('unpaid', 'partial', 'paid')
                  ),
  bill_photo_url  TEXT,
  bill_pdf_url    TEXT,
  note            TEXT,
  is_deleted      BOOLEAN DEFAULT FALSE,
  recorded_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_site_id ON expenses(site_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);

-- 5. EXPENSE LINE ITEMS
CREATE TABLE expense_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id      UUID REFERENCES expenses(id) ON DELETE CASCADE,
  material_id     UUID REFERENCES material_master(id),
  tile_master_id  UUID REFERENCES tile_master(id),
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,3) NOT NULL,
  unit            TEXT NOT NULL,
  rate            NUMERIC(10,2) NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expense_line_items_expense_id   ON expense_line_items(expense_id);
CREATE INDEX idx_expense_line_items_material_id  ON expense_line_items(material_id);
CREATE INDEX idx_expense_line_items_tile_id      ON expense_line_items(tile_master_id);

-- 6. EXPENSE PAYMENTS
CREATE TABLE expense_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id  UUID REFERENCES expenses(id) NOT NULL,
  date        DATE NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  mode        TEXT CHECK (mode IN ('cash', 'upi', 'cheque', 'neft')),
  reference   TEXT,
  note        TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expense_payments_expense_id ON expense_payments(expense_id);

-- 7. WORKER PAYMENTS
CREATE TABLE worker_payments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id      UUID REFERENCES sites(id) NOT NULL,
  worker_id    UUID REFERENCES workers(id) NOT NULL,
  date         DATE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN (
                 'sqft_payment', 'lumpsum', 'contract_milestone'
               )),
  amount       NUMERIC(10,2) NOT NULL,
  -- reference_id nullable; no FK constraint
  -- for sqft_payment -> points to tile_mason_assignments.id
  -- for contract_milestone -> points to gang_contract_milestones.id
  reference_id UUID,
  note         TEXT,
  recorded_by  UUID REFERENCES profiles(id),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_worker_payments_site_id   ON worker_payments(site_id);
CREATE INDEX idx_worker_payments_worker_id ON worker_payments(worker_id);

-- 8. GANG CONTRACT MILESTONES
CREATE TABLE gang_contract_milestones (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id          UUID REFERENCES sites(id) NOT NULL,
  team_id          UUID REFERENCES teams(id) NOT NULL,
  milestone_name   TEXT NOT NULL,
  milestone_amount NUMERIC(10,2) NOT NULL,
  due_date         DATE,
  paid_date        DATE,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_by          UUID REFERENCES profiles(id),
  note             TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gang_milestones_site_id ON gang_contract_milestones(site_id);
CREATE INDEX idx_gang_milestones_team_id ON gang_contract_milestones(team_id);

-- 9. ROOMS
CREATE TABLE rooms (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id        UUID REFERENCES sites(id) NOT NULL,
  name           TEXT NOT NULL,
  type           TEXT CHECK (type IN (
                   'bedroom', 'living', 'kitchen', 'bathroom',
                   'balcony', 'parking', 'staircase', 'pooja', 'store', 'other'
                 )),
  surface_type   TEXT NOT NULL CHECK (surface_type IN ('floor', 'wall')),
  length_ft      NUMERIC(6,2),
  width_ft       NUMERIC(6,2),
  entrance_edge  TEXT CHECK (entrance_edge IN ('top', 'right', 'bottom', 'left')),
  north_edge     TEXT CHECK (north_edge IN ('top', 'right', 'bottom', 'left')),
  start_corner   TEXT CHECK (start_corner IN (
                   'top-left', 'top-right', 'bottom-left', 'bottom-right'
                 )),
  cut_edges      JSONB DEFAULT '{"top":false,"right":false,"bottom":false,"left":false}',
  notes          TEXT,
  status         TEXT DEFAULT 'planned' CHECK (
                   status IN ('planned', 'in_progress', 'completed')
                 ),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rooms_site_id ON rooms(site_id);

-- 10. ROOM PHOTOS
CREATE TABLE room_photos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  photo_url   TEXT NOT NULL,
  caption     TEXT,
  sort_order  INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. ROOM TILE ZONES
CREATE TABLE room_tile_zones (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id        UUID REFERENCES rooms(id) ON DELETE CASCADE,
  zone_name      TEXT NOT NULL,
  tile_master_id UUID REFERENCES tile_master(id),
  area_sqft      NUMERIC(8,2),
  wastage_pct    NUMERIC(4,1) DEFAULT 10,
  required_qty   INTEGER,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ROOM TILE REQUIREMENTS
CREATE TABLE room_tile_requirements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id        UUID REFERENCES rooms(id) NOT NULL,
  tile_master_id UUID REFERENCES tile_master(id) NOT NULL,
  required_qty   INTEGER NOT NULL DEFAULT 0,
  received_qty   INTEGER NOT NULL DEFAULT 0,
  last_updated   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, tile_master_id)
);

CREATE INDEX idx_room_tile_req_room_id ON room_tile_requirements(room_id);
CREATE INDEX idx_room_tile_req_tile_id ON room_tile_requirements(tile_master_id);

-- 13. ROOM GRID MARKERS
CREATE TABLE room_grid_markers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  x           INTEGER NOT NULL,
  y           INTEGER NOT NULL,
  marker_type TEXT NOT NULL CHECK (
                marker_type IN ('door', 'window', 'fitting', 'column', 'start')
              ),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, x, y)
);

-- 14. TILE MASON ASSIGNMENTS
CREATE TABLE tile_mason_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id         UUID REFERENCES sites(id) NOT NULL,
  worker_id       UUID REFERENCES workers(id) NOT NULL,
  room_id         UUID REFERENCES rooms(id) NOT NULL,
  surface_type    TEXT NOT NULL CHECK (surface_type IN ('floor', 'wall')),
  rate_per_sqft   NUMERIC(6,2) NOT NULL,
  contracted_sqft NUMERIC(8,2) NOT NULL,
  completed_sqft  NUMERIC(8,2) DEFAULT 0,
  status          TEXT DEFAULT 'assigned' CHECK (
                    status IN ('assigned', 'in_progress', 'completed')
                  ),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tile_mason_assignments_site_id   ON tile_mason_assignments(site_id);
CREATE INDEX idx_tile_mason_assignments_worker_id ON tile_mason_assignments(worker_id);
CREATE INDEX idx_tile_mason_assignments_room_id   ON tile_mason_assignments(room_id);

-- 15. TILE MASON PROGRESS
CREATE TABLE tile_mason_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES tile_mason_assignments(id) NOT NULL,
  date          DATE NOT NULL,
  verified_sqft NUMERIC(8,2) NOT NULL,
  note          TEXT,
  verified_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tile_mason_progress_assignment_id ON tile_mason_progress(assignment_id);

-- 16. MATERIAL SHORTAGE REQUESTS
CREATE TABLE material_shortage_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id        UUID REFERENCES sites(id) NOT NULL,
  room_id        UUID REFERENCES rooms(id) NOT NULL,
  tile_master_id UUID REFERENCES tile_master(id) NOT NULL,
  requested_qty  INTEGER NOT NULL,
  urgency        TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  note           TEXT,
  status         TEXT DEFAULT 'pending' CHECK (
                   status IN ('pending', 'approved', 'dispatched', 'received', 'rejected')
                 ),
  requested_by   UUID REFERENCES profiles(id),
  approved_by    UUID REFERENCES profiles(id),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. NOTIFICATIONS
CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES profiles(id) NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT CHECK (type IN (
                 'tile_purchased_unassigned',
                 'shortage_request',
                 'milestone_paid',
                 'attendance_submitted',
                 'client_payment_added'
               )),
  reference_id UUID,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- End of migration
