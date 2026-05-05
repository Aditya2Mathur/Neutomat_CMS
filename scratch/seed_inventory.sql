-- ==========================================
-- INVENTORY SEED SCRIPT (20 MEDICINES)
-- 10 Neuro Medicines & 10 Gynec Medicines
-- Stock: 100 each
-- ==========================================

INSERT INTO "Inventory" ("MedicineID", "Name", "Category", "Stock", "Unit", "MinStock", "Price", "LastUpdated")
VALUES 
    -- Neuro Surgeon MEDICINES
    ('MED-N01', 'Levetiracetam 500mg', 'Tablet', 100, 'strips', 10, 150, NOW()),
    ('MED-N02', 'Sodium Valproate 200mg', 'Tablet', 100, 'strips', 10, 120, NOW()),
    ('MED-N03', 'Carbamazepine 200mg', 'Tablet', 100, 'strips', 10, 110, NOW()),
    ('MED-N04', 'Phenytoin 100mg', 'Capsule', 100, 'strips', 10, 95, NOW()),
    ('MED-N05', 'Gabapentin 300mg', 'Capsule', 100, 'strips', 10, 200, NOW()),
    ('MED-N06', 'Pregabalin 75mg', 'Capsule', 100, 'strips', 10, 180, NOW()),
    ('MED-N07', 'Clonazepam 0.5mg', 'Tablet', 100, 'strips', 10, 60, NOW()),
    ('MED-N08', 'Amitriptyline 25mg', 'Tablet', 100, 'strips', 10, 50, NOW()),
    ('MED-N09', 'Donepezil 5mg', 'Tablet', 100, 'strips', 10, 220, NOW()),
    ('MED-N10', 'Memantine 10mg', 'Tablet', 100, 'strips', 10, 190, NOW()),

    -- GYNECOLOGY MEDICINES
    ('MED-G01', 'Folic Acid 5mg', 'Tablet', 100, 'strips', 10, 30, NOW()),
    ('MED-G02', 'Iron Supplements (Ferrous Ascorbate)', 'Tablet', 100, 'strips', 10, 140, NOW()),
    ('MED-G03', 'Calcium + Vitamin D3', 'Tablet', 100, 'strips', 10, 160, NOW()),
    ('MED-G04', 'Progesterone 200mg', 'Capsule', 100, 'strips', 10, 350, NOW()),
    ('MED-G05', 'Dydrogesterone 10mg', 'Tablet', 100, 'strips', 10, 480, NOW()),
    ('MED-G06', 'Clomiphene 50mg', 'Tablet', 100, 'strips', 10, 210, NOW()),
    ('MED-G07', 'Letrozole 2.5mg', 'Tablet', 100, 'strips', 10, 185, NOW()),
    ('MED-G08', 'Metformin 500mg SR', 'Tablet', 100, 'strips', 10, 65, NOW()),
    ('MED-G09', 'Tranexamic Acid 500mg', 'Tablet', 100, 'strips', 10, 130, NOW()),
    ('MED-G10', 'Mefenamic Acid 250mg', 'Tablet', 100, 'strips', 10, 80, NOW());
