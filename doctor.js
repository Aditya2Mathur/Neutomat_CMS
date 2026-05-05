/* ===== CLINIC ERP — DOCTOR MODULE ===== */

const Doctor = (() => {
    let currentQueueFilter = 'assigned';
    let currentAppointment = null;
    let medicineRowCount = 0;

    /* --- Load Patient Queue --- */
    async function loadQueue(filter) {
        if (filter) currentQueueFilter = filter;

        const container = document.getElementById('doctor-queue-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="spinner" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary);"></span>
                    <p>Loading patient queue...</p>
                </div>`;
        }

        await API.appointments.list();

        const user = App.getCurrentUser();
        const allRecords = API.getCache('allRecords') || [];

        let queue = allRecords.filter(r => {
            const status = r.status || r.Status || 'booked';

            // For doctors, show only their assigned patients
            if (user && user.role === 'doctor') {
                const docId = r.doctorId || r.DoctorID || '';
                if (docId && docId !== user.username) return false;

                // Also match by specialty if no doctorId
                if (!docId) {
                    const spec = r.specialty || r.Specialty || '';
                    if (spec !== user.specialty && user.specialty !== 'general') return false;
                }
            }

            // Filter by status
            if (currentQueueFilter === 'assigned') {
                return status === 'assigned' || status === 'booked';
            } else if (currentQueueFilter === 'in_consultation') {
                return status === 'in_consultation';
            } else if (currentQueueFilter === 'completed') {
                return status === 'prescription_completed' || status === 'sent_to_pharmacy' || status === 'dispensed';
            }
            return true;
        });

        // Sort: today first, then by time
        queue.sort((a, b) => {
            const aDate = new Date(a.Timestamp || a.createdAt || 0);
            const bDate = new Date(b.Timestamp || b.createdAt || 0);
            // Today's patients first, newest first
            const aToday = Utils.isToday(a.Timestamp || a.createdAt) ? 0 : 1;
            const bToday = Utils.isToday(b.Timestamp || b.createdAt) ? 0 : 1;
            if (aToday !== bToday) return aToday - bToday;
            return bDate - aDate;
        });

        renderQueue(queue);
    }

    /* --- Filter Queue --- */
    function filterQueue(filter, btnEl) {
        currentQueueFilter = filter;
        Utils.$all('#doctor-queue .filter-tab').forEach(t => t.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        loadQueue(filter);
    }

    /* --- Render Queue --- */
    function renderQueue(queue) {
        const container = document.getElementById('doctor-queue-list');
        if (!container) return;

        if (queue.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-queue"></i>
                    <h3>No patients in queue</h3>
                    <p>${currentQueueFilter === 'assigned' ? 'No waiting patients. Check back later.' : 'No patients with this status.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = `<div class="queue-list">${queue.map((r, i) => {
            const aptId = r.appointmentId || r.AppointmentID || r['Appointment ID'] || '-';
            const name = r.name || r.Name || 'Unknown';
            const age = r.age || r.Age || '-';
            const gender = Utils.genderShort(r.gender || r.Gender);
            const phone = r.phone || r.Phone || '-';
            const specialty = Utils.capitalize(r.specialty || r.Specialty || '-');
            const symptoms = Utils.truncate(r.symptoms || r.Symptoms || 'None', 50);
            const status = r.status || r.Status || 'booked';
            const time = Utils.formatTime(r.Timestamp || r.createdAt);

            let actionBtn = '';
            if (status === 'assigned' || status === 'booked') {
                actionBtn = `<button class="btn btn-sm btn-primary" onclick="Doctor.startConsultation('${aptId}')">
                    <i class="ph ph-stethoscope"></i> Consult
                </button>`;
            } else if (status === 'in_consultation') {
                actionBtn = `<button class="btn btn-sm btn-warning" onclick="Doctor.openPrescription('${aptId}')">
                    <i class="ph ph-prescription"></i> Continue
                </button>`;
            } else {
                actionBtn = `<button class="btn btn-sm btn-outline" onclick="Doctor.viewPrescription('${aptId}')">
                    <i class="ph ph-eye"></i> View
                </button>`;
            }

            return `
                <div class="queue-item">
                    <div class="q-number">${i + 1}</div>
                    <div class="q-info">
                        <div class="q-name">${Utils.escapeHtml(name)} <span style="color:var(--text-muted); font-weight:400; font-size:0.8rem;">${age}/${gender}</span></div>
                        <div class="q-meta">
                            ${phone} • ${specialty} • ${symptoms} • ${time}
                        </div>
                    </div>
                    <div style="margin-right: 0.5rem;">${Utils.statusBadge(status)}</div>
                    <div class="q-actions">${actionBtn}</div>
                </div>`;
        }).join('')}</div>`;
    }

    /* --- Start Consultation --- */
    function startConsultation(aptId) {
        // Update status to in_consultation
        const cached = API.getCache('allRecords') || [];
        const idx = cached.findIndex(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        );
        if (idx >= 0) {
            cached[idx].status = 'in_consultation';
            cached[idx].Status = 'in_consultation';
            API.setCache('allRecords', cached);
        }

        API.appointments.update(aptId, { status: 'in_consultation' });
        openPrescription(aptId);
    }

    /* --- Open Prescription Editor --- */
    function openPrescription(aptId) {
        const records = API.getCache('allRecords') || [];
        const record = records.find(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        );
        if (!record) {
            Utils.showToast('Record not found.', 'error');
            return;
        }

        currentAppointment = record;

        // Auto-complete feature for medicines
        let datalist = document.getElementById('inventory-medicines-list');
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = 'inventory-medicines-list';
            document.body.appendChild(datalist);
        }
        const inventory = API.getCache('inventory') || [];
        datalist.innerHTML = inventory.map(item => `<option value="${Utils.escapeHtml(item.name || item.Name)}">`).join('');

        // Fill patient info
        document.getElementById('rx-appt-id').textContent = aptId;
        document.getElementById('rx-patient-name').value = record.name || record.Name || '-';
        document.getElementById('rx-patient-age-gender').value =
            `${record.age || record.Age || '-'} / ${record.gender || record.Gender || '-'}`;
        document.getElementById('rx-patient-phone').value = record.phone || record.Phone || '-';
        document.getElementById('rx-patient-weight').value =
            (record.weight || record.Weight || '-') + ' kg';
        document.getElementById('rx-patient-symptoms').textContent =
            record.symptoms || record.Symptoms || 'None';

        // Clear prescription fields
        document.getElementById('rx-diagnosis').value = '';
        document.getElementById('rx-notes').value = '';
        document.getElementById('rx-advice').value = '';

        // Reset medicine table with 3 empty rows
        medicineRowCount = 0;
        document.getElementById('medicine-tbody').innerHTML = '';
        addMedicineRow();
        addMedicineRow();
        addMedicineRow();

        // Check for existing prescription (draft)
        const prescriptions = API.getCache('prescriptions') || [];
        const existingRx = prescriptions.find(p =>
            (p.appointmentId || p.AppointmentID || p['Appointment ID']) === aptId
        );
        if (existingRx) {
            document.getElementById('rx-diagnosis').value = existingRx.diagnosis || '';
            document.getElementById('rx-notes').value = existingRx.notes || '';
            document.getElementById('rx-advice').value = existingRx.advice || '';

            // Restore medicines
            if (existingRx.medicines) {
                try {
                    const meds = typeof existingRx.medicines === 'string'
                        ? JSON.parse(existingRx.medicines)
                        : existingRx.medicines;
                    if (Array.isArray(meds) && meds.length > 0) {
                        document.getElementById('medicine-tbody').innerHTML = '';
                        medicineRowCount = 0;
                        meds.forEach(med => {
                            addMedicineRow(med);
                        });
                    }
                } catch (e) { /* ignore parse error */ }
            }
        }

        // Navigate to prescription editor
        App.navigateTo('prescription-editor');
    }

    /* --- Add Medicine Row --- */
    function addMedicineRow(data = {}) {
        medicineRowCount++;
        const tbody = document.getElementById('medicine-tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align:center; color:var(--text-muted); font-weight:600;">${medicineRowCount}</td>
            <td><input type="text" placeholder="Medicine name" class="med-name" list="inventory-medicines-list" value="${Utils.escapeHtml(data.name || '')}"></td>
            <td><input type="text" placeholder="e.g. 500mg" class="med-dosage" value="${Utils.escapeHtml(data.dosage || '')}"></td>
            <td>
                <select class="med-frequency">
                    <option value="">Select</option>
                    <option value="OD (Once daily)" ${data.frequency === 'OD (Once daily)' ? 'selected' : ''}>OD (Once daily)</option>
                    <option value="BD (Twice daily)" ${data.frequency === 'BD (Twice daily)' ? 'selected' : ''}>BD (Twice daily)</option>
                    <option value="TDS (Thrice daily)" ${data.frequency === 'TDS (Thrice daily)' ? 'selected' : ''}>TDS (Thrice daily)</option>
                    <option value="QID (Four times)" ${data.frequency === 'QID (Four times)' ? 'selected' : ''}>QID (Four times)</option>
                    <option value="SOS (As needed)" ${data.frequency === 'SOS (As needed)' ? 'selected' : ''}>SOS (As needed)</option>
                    <option value="HS (At bedtime)" ${data.frequency === 'HS (At bedtime)' ? 'selected' : ''}>HS (At bedtime)</option>
                    <option value="Stat (Immediately)" ${data.frequency === 'Stat (Immediately)' ? 'selected' : ''}>Stat (Immediately)</option>
                </select>
            </td>
            <td><input type="text" placeholder="e.g. 5 days" class="med-duration" value="${Utils.escapeHtml(data.duration || '')}"></td>
            <td><input type="text" placeholder="Before/after food" class="med-instructions" value="${Utils.escapeHtml(data.instructions || '')}"></td>
            <td><button class="row-remove" onclick="Doctor.removeMedicineRow(this)" title="Remove"><i class="ph ph-x"></i></button></td>
        `;
        tbody.appendChild(row);
    }

    /* --- Remove Medicine Row --- */
    function removeMedicineRow(btn) {
        const row = btn.closest('tr');
        if (row) row.remove();
        renumberMedicineRows();
    }

    /* --- Renumber Medicine Rows --- */
    function renumberMedicineRows() {
        const rows = document.querySelectorAll('#medicine-tbody tr');
        rows.forEach((row, i) => {
            row.querySelector('td:first-child').textContent = i + 1;
        });
        medicineRowCount = rows.length;
    }

    /* --- Collect Medicines from Table --- */
    function collectMedicines() {
        const rows = document.querySelectorAll('#medicine-tbody tr');
        const medicines = [];
        rows.forEach(row => {
            const name = row.querySelector('.med-name')?.value.trim();
            if (!name) return; // Skip empty rows

            medicines.push({
                name,
                dosage: row.querySelector('.med-dosage')?.value.trim() || '',
                frequency: row.querySelector('.med-frequency')?.value || '',
                duration: row.querySelector('.med-duration')?.value.trim() || '',
                instructions: row.querySelector('.med-instructions')?.value.trim() || ''
            });
        });
        return medicines;
    }

    /* --- Save Prescription --- */
    async function savePrescription(finalStatus) {
        if (!currentAppointment) {
            Utils.showToast('No appointment selected.', 'error');
            return;
        }

        const diagnosis = document.getElementById('rx-diagnosis').value.trim();
        if (!diagnosis && finalStatus === 'completed') {
            Utils.showToast('Please enter a diagnosis before completing.', 'error');
            return;
        }

        const medicines = collectMedicines();
        if (medicines.length === 0 && finalStatus === 'completed') {
            Utils.showToast('Please add at least one medicine.', 'error');
            return;
        }

        const aptId = currentAppointment.appointmentId || currentAppointment.AppointmentID || currentAppointment['Appointment ID'];
        const user = App.getCurrentUser();

        const rxData = {
            prescriptionId: Utils.generateId('RX'),
            appointmentId: aptId,
            patientId: currentAppointment.patientId || currentAppointment.PatientID || currentAppointment['Patient ID'],
            doctorId: user?.username || '',
            doctorName: user?.name || '',
            diagnosis,
            notes: document.getElementById('rx-notes').value.trim(),
            advice: document.getElementById('rx-advice').value.trim(),
            medicines: JSON.stringify(medicines),
            status: finalStatus === 'completed' ? 'sent_to_pharmacy' : 'draft',
            createdAt: Utils.nowISO(),
            completedAt: finalStatus === 'completed' ? Utils.nowISO() : ''
        };

        // Save prescription
        await API.prescriptions.save(rxData);

        // Update appointment status
        const newApptStatus = finalStatus === 'completed' ? 'prescription_completed' : 'in_consultation';
        const cached = API.getCache('allRecords') || [];
        const idx = cached.findIndex(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        );
        if (idx >= 0) {
            cached[idx].status = newApptStatus;
            cached[idx].Status = newApptStatus;
            API.setCache('allRecords', cached);
        }

        await API.appointments.update(aptId, { status: newApptStatus });

        if (finalStatus === 'completed') {
            Utils.showToast('Prescription completed and sent to pharmacy!', 'success');

            // Show print view
            PrintModule.renderPrescription({
                ...currentAppointment,
                ...rxData,
                medicines
            });
            App.navigateTo('print-view');
        } else {
            Utils.showToast('Prescription draft saved.', 'info');
        }

        currentAppointment = null;
    }

    /* --- View Completed Prescription --- */
    function viewPrescription(aptId) {
        const prescriptions = API.getCache('prescriptions') || [];
        const rx = prescriptions.find(p =>
            (p.appointmentId || p.AppointmentID || p['Appointment ID']) === aptId
        );
        const records = API.getCache('allRecords') || [];
        const record = records.find(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        );

        if (rx && record) {
            let meds = rx.medicines || rx.Medicines || '[]';
            if (typeof meds === 'string') {
                try { meds = JSON.parse(meds); } catch (e) { meds = []; }
            }
            PrintModule.renderPrescription({ ...record, ...rx, medicines: meds });
            App.navigateTo('print-view');
        } else if (record) {
            // No prescription yet, open editor
            openPrescription(aptId);
        } else {
            Utils.showToast('Record not found.', 'error');
        }
    }

    return {
        loadQueue,
        filterQueue,
        startConsultation,
        openPrescription,
        addMedicineRow,
        removeMedicineRow,
        savePrescription,
        viewPrescription
    };
})();
