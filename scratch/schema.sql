-- Supabase Schema for ADV_CMS
-- Drop tables if they exist to start fresh
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "DispenseLog" CASCADE;
DROP TABLE IF EXISTS "Inventory" CASCADE;
DROP TABLE IF EXISTS "Prescriptions" CASCADE;
DROP TABLE IF EXISTS "Appointments" CASCADE;
DROP TABLE IF EXISTS "Patients" CASCADE;
DROP TABLE IF EXISTS "Users" CASCADE;

CREATE TABLE "Users" (
    "Username" TEXT PRIMARY KEY,
    "PasswordHash" TEXT,
    "Role" TEXT,
    "FullName" TEXT,
    "Specialty" TEXT,
    "Email" TEXT,
    "IsActive" BOOLEAN DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default users based on README
INSERT INTO "Users" ("Username", "PasswordHash", "Role", "FullName", "Specialty") VALUES 
('admin', 'admin123', 'admin', 'System Admin', ''),
('reception', 'rec123', 'reception', 'Receptionist', ''),
('doctor', 'doc123', 'doctor', 'Dr. General', 'General'),
('neuro', 'neuro123', 'doctor', 'Dr. Neuro', 'Neuro Surgeon'),
('gynec', 'gynec123', 'doctor', 'Dr. Gynec', 'Gynecology'),
('pharmacy', 'pharm123', 'pharmacy', 'Pharmacy Staff', '')
ON CONFLICT ("Username") DO NOTHING;

CREATE TABLE "Patients" (
    "PatientID" TEXT PRIMARY KEY,
    "Name" TEXT,
    "Age" INTEGER,
    "Gender" TEXT,
    "Phone" TEXT,
    "Address" TEXT,
    "Weight" TEXT,
    "BloodGroup" TEXT,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "LastVisit" TIMESTAMPTZ
);

CREATE TABLE "Appointments" (
    "AppointmentID" TEXT PRIMARY KEY,
    "PatientID" TEXT REFERENCES "Patients"("PatientID"),
    "DoctorID" TEXT REFERENCES "Users"("Username"),
    "DoctorName" TEXT,
    "Specialty" TEXT,
    "Name" TEXT,
    "Age" INTEGER,
    "Gender" TEXT,
    "Phone" TEXT,
    "Address" TEXT,
    "Weight" TEXT,
    "Symptoms" TEXT,
    "Fee" NUMERIC,
    "Status" TEXT,
    "BookedBy" TEXT,
    "AppointmentDate" DATE,
    "AppointmentTime" TIME,
    "VisitCount" INTEGER,
    "ValidTill" DATE,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "Timestamp" TIMESTAMPTZ
);

CREATE TABLE "Prescriptions" (
    "PrescriptionID" TEXT PRIMARY KEY,
    "AppointmentID" TEXT REFERENCES "Appointments"("AppointmentID"),
    "PatientID" TEXT REFERENCES "Patients"("PatientID"),
    "DoctorID" TEXT REFERENCES "Users"("Username"),
    "DoctorName" TEXT,
    "Diagnosis" TEXT,
    "Notes" TEXT,
    "Advice" TEXT,
    "Medicines" JSONB,
    "Status" TEXT,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "CompletedAt" TIMESTAMPTZ
);

CREATE TABLE "Inventory" (
    "MedicineID" TEXT PRIMARY KEY,
    "Name" TEXT,
    "Category" TEXT,
    "Stock" INTEGER,
    "Unit" TEXT,
    "MinStock" INTEGER,
    "Price" NUMERIC,
    "LastUpdated" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "DispenseLog" (
    "DispenseID" TEXT PRIMARY KEY,
    "PrescriptionID" TEXT REFERENCES "Prescriptions"("PrescriptionID"),
    "PatientID" TEXT REFERENCES "Patients"("PatientID"),
    "Medicines" JSONB,
    "TotalAmount" NUMERIC,
    "Status" TEXT,
    "Timestamp" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "AuditLog" (
    "LogID" TEXT PRIMARY KEY,
    "Timestamp" TIMESTAMPTZ DEFAULT NOW(),
    "UserAccount" TEXT REFERENCES "Users"("Username"),
    "Action" TEXT,
    "Entity" TEXT,
    "EntityID" TEXT,
    "Details" TEXT
);
