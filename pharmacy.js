/* ===== CLINIC ERP — PHARMACY MODULE ===== */

const Pharmacy = (() => {
    let currentFilter = 'pending';

    /* --- Load Pharmacy Queue --- */
    async function loadQueue(filter) {
        if (filter) currentFilter = filter;

        const container = document.getElementById('pharmacy-queue-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="spinner" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary);"></span>
                    <p>Loading pharmacy queue...</p>
                </div>`;
        }

        await API.prescriptions.list();
        await API.appointments.list();

        const prescriptions = API.getCache('prescriptions') || [];
        const allRecords = API.getCache('allRecords') || [];

        let queue;
        if (currentFilter === 'pending') {
            queue = prescriptions.filter(p =>
                (p.status || p.Status) === 'sent_to_pharmacy'
            );
        } else {
            queue = prescriptions.filter(p =>
                (p.status || p.Status) === 'dispensed'
            );
        }

        // Enrich with patient data
        queue = queue.map(rx => {
            const aptId = rx.appointmentId || rx.AppointmentID || rx['Appointment ID'];
            const record = allRecords.find(r =>
                (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
            );
            return { ...rx, _patient: record || {} };
        });

        // Sort: newest first
        queue.sort((a, b) =>
            new Date(b.createdAt || b.CreatedAt || 0) - new Date(a.createdAt || a.CreatedAt || 0)
        );

        renderQueue(queue);
    }

    /* --- Filter Queue --- */
    function filterQueue(filter, btnEl) {
        currentFilter = filter;
        Utils.$all('#pharmacy-queue .filter-tab').forEach(t => t.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        loadQueue(filter);
    }

    /* --- Render Queue --- */
    function renderQueue(queue) {
        const container = document.getElementById('pharmacy-queue-list');
        if (!container) return;

        if (queue.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-prescription"></i>
                    <h3>No ${currentFilter === 'pending' ? 'pending' : 'dispensed'} prescriptions</h3>
                    <p>${currentFilter === 'pending' ? 'Completed prescriptions from doctors will appear here.' : 'No dispensed records yet.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="queue-list">${queue.map((rx, i) => {
            const p = rx._patient;
            const rxId = rx.prescriptionId || rx.PrescriptionID || rx['Prescription ID'] || '-';
            const name = p.name || p.Name || 'Unknown';
            const phone = p.phone || p.Phone || '-';
            const doctor = rx.doctorName || rx.DoctorName || '-';
            const diagnosis = Utils.truncate(rx.diagnosis || rx.Diagnosis || '-', 40);
            const status = rx.status || rx.Status;
            const time = Utils.formatTime(rx.createdAt || rx.CreatedAt);

            // Parse medicines count
            let medCount = 0;
            let medsData = rx.medicines || rx.Medicines;
            try {
                const meds = typeof medsData === 'string' ? JSON.parse(medsData) : (medsData || []);
                medCount = meds.length;
            } catch (e) { /* ignore */ }

            let actionBtns = '';
            if (status === 'sent_to_pharmacy') {
                actionBtns = `
                    <button class="btn btn-sm btn-outline" onclick="Pharmacy.viewPrescription('${rxId}')" title="View">
                        <i class="ph ph-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-success" onclick="Pharmacy.dispenseRx('${rxId}')" title="Dispense">
                        <i class="ph ph-check-circle"></i> Dispense
                    </button>`;
            } else {
                actionBtns = `
                    <button class="btn btn-sm btn-outline" onclick="Pharmacy.viewPrescription('${rxId}')" title="View">
                        <i class="ph ph-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="Pharmacy.printRx('${rxId}')" title="Print">
                        <i class="ph ph-printer"></i>
                    </button>`;
            }

            return `
                <div class="queue-item" style="cursor: default;">
                    <div class="q-number" style="background: ${status === 'sent_to_pharmacy' ? 'var(--orange-100)' : 'var(--green-100)'}; color: ${status === 'sent_to_pharmacy' ? 'var(--orange-600)' : 'var(--green-600)'};">${i + 1}</div>
                    <div class="q-info" style="flex: 1;">
                        <div class="q-name">${Utils.escapeHtml(name)} <span style="color:var(--text-muted); font-weight:400; font-size:0.78rem;">${rxId}</span></div>
                        <div class="q-meta">
                            ${phone} • Dr. ${doctor} • ${diagnosis} • ${medCount} medicine(s) • ${time}
                        </div>
                    </div>
                    <div style="margin-right: 0.5rem;">${Utils.statusBadge(status)}</div>
                    <div class="q-actions" style="display:flex; gap:0.4rem;">
                        ${actionBtns}
                    </div>
                </div>`;
        }).join('')}</div>`;
    }

    /* --- View Prescription Detail --- */
    function viewPrescription(rxId) {
        const prescriptions = API.getCache('prescriptions') || [];
        const rx = prescriptions.find(p =>
            (p.prescriptionId || p.PrescriptionID || p['Prescription ID']) === rxId
        );
        if (!rx) {
            Utils.showToast('Prescription not found.', 'error');
            return;
        }

        const allRecords = API.getCache('allRecords') || [];
        const aptId = rx.appointmentId || rx.AppointmentID || rx['Appointment ID'];
        const record = allRecords.find(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        ) || {};

        let medsData = rx.medicines || rx.Medicines;
        let meds = [];
        try {
            meds = typeof medsData === 'string' ? JSON.parse(medsData) : (medsData || []);
        } catch (e) { /* ignore */ }

        // Show in print view
        PrintModule.renderPrescription({ ...record, ...rx, medicines: meds });
        App.navigateTo('print-view');
    }

    /* --- Dispense Prescription --- */
    async function dispenseRx(rxId) {
        const prescriptions = API.getCache('prescriptions') || [];
        const idx = prescriptions.findIndex(p =>
            (p.prescriptionId || p.PrescriptionID || p['Prescription ID']) === rxId
        );

        if (idx < 0) {
            Utils.showToast('Prescription not found.', 'error');
            return;
        }

        const rx = prescriptions[idx];

        let medsData = rx.medicines || rx.Medicines;
        let meds = [];
        try {
            meds = typeof medsData === 'string' ? JSON.parse(medsData) : (medsData || []);
        } catch (e) { /* ignore */ }

        // Update local cache
        prescriptions[idx].status = 'dispensed';
        prescriptions[idx].Status = 'dispensed';
        prescriptions[idx].dispensedAt = Utils.nowISO();
        prescriptions[idx].dispensedBy = App.getCurrentUser()?.username || 'pharmacy';
        API.setCache('prescriptions', prescriptions);

        // Update appointment status too
        const aptId = prescriptions[idx].appointmentId || prescriptions[idx].AppointmentID || prescriptions[idx]['Appointment ID'];
        const allRecords = API.getCache('allRecords') || [];
        const aptIdx = allRecords.findIndex(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        );
        
        let record = {};
        if (aptIdx >= 0) {
            allRecords[aptIdx].status = 'dispensed';
            allRecords[aptIdx].Status = 'dispensed';
            record = allRecords[aptIdx];
            API.setCache('allRecords', allRecords);
        }

        // Send to backend (log the dispensed items!)
        await API.pharmacy.dispense(rxId, meds);
        await API.appointments.update(aptId, { status: 'dispensed' });

        Utils.showToast('Prescription dispensed successfully!', 'success');

        // Show print view
        PrintModule.renderPrescription({ ...record, ...rx, medicines: meds });
        App.navigateTo('print-view');
    }

    /* --- Print Prescription --- */
    function printRx(rxId) {
        viewPrescription(rxId);
        setTimeout(() => PrintModule.print(), 500);
    }

    /* --- Load Inventory --- */
    async function loadInventory() {
        const inventory = await API.inventory.list();
        renderInventory(inventory);
    }

    /* --- Search Inventory --- */
    async function searchInventory(query) {
        const inventory = API.getCache('inventory') || await API.inventory.list() || getDemoInventory();
        const q = query.toLowerCase().trim();
        if (!q) {
            renderInventory(inventory);
            return;
        }
        const filtered = inventory.filter(m =>
            (m.name || '').toLowerCase().includes(q) ||
            (m.category || '').toLowerCase().includes(q)
        );
        renderInventory(filtered);
    }

    /* --- Render Inventory Table --- */
    function renderInventory(items) {
        const tbody = document.querySelector('#inventory-table tbody');
        if (!tbody) return;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
                <i class="ph ph-package"></i>No medicines found
            </td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(m => {
            const stock = parseInt(m.stock || m.Stock || 0);
            const minStock = parseInt(m.minStock || m.MinStock || 10);
            const isLow = stock <= minStock;

            return `<tr>
                <td><strong>${Utils.escapeHtml(m.name || m.Name)}</strong></td>
                <td>${Utils.escapeHtml(m.category || m.Category || '-')}</td>
                <td style="font-weight: 600; color: ${isLow ? 'var(--danger)' : 'var(--text)'};">${stock}</td>
                <td>${m.unit || m.Unit || 'strips'}</td>
                <td>${minStock}</td>
                <td>${Utils.formatCurrency(m.price || m.Price || 0)}</td>
                <td>${isLow ? '<span class="badge badge-red">Low Stock</span>' : '<span class="badge badge-green">In Stock</span>'}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="Pharmacy.editStock('${m.medicineId || m.MedicineID}')" title="Edit">
                        <i class="ph ph-pencil"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    /* --- Edit Stock (Modal) --- */
    function editStock(medId) {
        const inventory = API.getCache('inventory') || getDemoInventory();
        const med = inventory.find(m => (m.medicineId || m.MedicineID) === medId);
        if (!med) return;

        const html = `
            <div class="form-group mb-2">
                <label>Medicine Name</label>
                <input type="text" class="form-control" value="${Utils.escapeHtml(med.name || med.Name)}" readonly>
            </div>
            <div class="form-row form-row-2">
                <div class="form-group">
                    <label>Current Stock</label>
                    <input type="number" id="edit-stock-qty" class="form-control" value="${med.stock || med.Stock || 0}">
                </div>
                <div class="form-group">
                    <label>Price (₹)</label>
                    <input type="number" id="edit-stock-price" class="form-control" value="${med.price || med.Price || 0}">
                </div>
            </div>
        `;

        openModal('Edit Stock', html, `
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Pharmacy.saveStock('${medId}')">
                <i class="ph ph-floppy-disk"></i> Save
            </button>
        `);
    }

    /* --- Save Stock --- */
    async function saveStock(medId) {
        const qty = document.getElementById('edit-stock-qty').value;
        const price = document.getElementById('edit-stock-price').value;

        const inventory = API.getCache('inventory') || getDemoInventory();
        const idx = inventory.findIndex(m => (m.medicineId || m.MedicineID) === medId);
        if (idx >= 0) {
            inventory[idx].stock = parseInt(qty);
            inventory[idx].Stock = parseInt(qty);
            inventory[idx].price = parseFloat(price);
            inventory[idx].Price = parseFloat(price);
            inventory[idx].lastUpdated = Utils.nowISO();
            API.setCache('inventory', inventory);
        }

        await API.inventory.update(medId, qty);
        Utils.showToast('Stock updated successfully.', 'success');
        closeModal();
        renderInventory(inventory);
    }

    /* --- Show Add Medicine Modal --- */
    function showAddMedicineModal() {
        const html = `
            <div class="form-group mb-2">
                <label>Medicine Name <span class="required">*</span></label>
                <input type="text" id="new-med-name" class="form-control" placeholder="e.g. Paracetamol 500mg">
            </div>
            <div class="form-row form-row-2">
                <div class="form-group">
                    <label>Category</label>
                    <select id="new-med-category" class="form-control">
                        <option value="Tablet">Tablet</option>
                        <option value="Capsule">Capsule</option>
                        <option value="Syrup">Syrup</option>
                        <option value="Injection">Injection</option>
                        <option value="Ointment">Ointment</option>
                        <option value="Drops">Drops</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unit</label>
                    <select id="new-med-unit" class="form-control">
                        <option value="strips">Strips</option>
                        <option value="bottles">Bottles</option>
                        <option value="vials">Vials</option>
                        <option value="tubes">Tubes</option>
                        <option value="pcs">Pieces</option>
                    </select>
                </div>
            </div>
            <div class="form-row form-row-3">
                <div class="form-group">
                    <label>Initial Stock</label>
                    <input type="number" id="new-med-stock" class="form-control" value="100">
                </div>
                <div class="form-group">
                    <label>Min Stock Alert</label>
                    <input type="number" id="new-med-min" class="form-control" value="10">
                </div>
                <div class="form-group">
                    <label>Price (₹)</label>
                    <input type="number" id="new-med-price" class="form-control" value="0">
                </div>
            </div>
        `;

        openModal('Add Medicine', html, `
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-success" onclick="Pharmacy.addMedicine()">
                <i class="ph ph-plus-circle"></i> Add Medicine
            </button>
        `);
    }

    /* --- Add Medicine --- */
    async function addMedicine() {
        const name = document.getElementById('new-med-name').value.trim();
        if (!name) {
            Utils.showToast('Medicine name is required.', 'error');
            return;
        }

        const newMed = {
            medicineId: Utils.generateId('MED'),
            MedicineID: Utils.generateId('MED'),
            name,
            Name: name,
            category: document.getElementById('new-med-category').value,
            Category: document.getElementById('new-med-category').value,
            stock: parseInt(document.getElementById('new-med-stock').value) || 0,
            Stock: parseInt(document.getElementById('new-med-stock').value) || 0,
            unit: document.getElementById('new-med-unit').value,
            Unit: document.getElementById('new-med-unit').value,
            minStock: parseInt(document.getElementById('new-med-min').value) || 10,
            MinStock: parseInt(document.getElementById('new-med-min').value) || 10,
            price: parseFloat(document.getElementById('new-med-price').value) || 0,
            Price: parseFloat(document.getElementById('new-med-price').value) || 0,
            lastUpdated: Utils.nowISO()
        };

        const inventory = API.getCache('inventory') || getDemoInventory();
        inventory.push(newMed);
        API.setCache('inventory', inventory);

        await API.inventory.add(newMed);
        Utils.showToast(`${name} added to inventory!`, 'success');
        closeModal();
        renderInventory(inventory);
    }

    /* --- Demo Inventory Data --- */
    function getDemoInventory() {
        const demo = [
            { medicineId: 'MED-001', name: 'Paracetamol 500mg', category: 'Tablet', stock: 250, unit: 'strips', minStock: 20, price: 25 },
            { medicineId: 'MED-002', name: 'Amoxicillin 500mg', category: 'Capsule', stock: 150, unit: 'strips', minStock: 15, price: 45 },
            { medicineId: 'MED-003', name: 'Cetirizine 10mg', category: 'Tablet', stock: 200, unit: 'strips', minStock: 20, price: 15 },
            { medicineId: 'MED-004', name: 'Omeprazole 20mg', category: 'Capsule', stock: 180, unit: 'strips', minStock: 15, price: 35 },
            { medicineId: 'MED-005', name: 'Cough Syrup (Benadryl)', category: 'Syrup', stock: 80, unit: 'bottles', minStock: 10, price: 85 },
            { medicineId: 'MED-006', name: 'Ibuprofen 400mg', category: 'Tablet', stock: 120, unit: 'strips', minStock: 10, price: 30 },
            { medicineId: 'MED-007', name: 'Azithromycin 500mg', category: 'Tablet', stock: 8, unit: 'strips', minStock: 10, price: 95 },
            { medicineId: 'MED-008', name: 'Metformin 500mg', category: 'Tablet', stock: 5, unit: 'strips', minStock: 15, price: 22 },
            { medicineId: 'MED-009', name: 'Betadine Ointment', category: 'Ointment', stock: 45, unit: 'tubes', minStock: 5, price: 55 },
            { medicineId: 'MED-010', name: 'Diclofenac Gel', category: 'Ointment', stock: 60, unit: 'tubes', minStock: 8, price: 65 },
        ];
        API.setCache('inventory', demo);
        return demo;
    }

    return {
        loadQueue,
        filterQueue,
        loadInventory,
        searchInventory,
        editStock,
        saveStock,
        showAddMedicineModal,
        addMedicine,
        viewPrescription,
        dispenseRx,
        printRx
    };
})();
