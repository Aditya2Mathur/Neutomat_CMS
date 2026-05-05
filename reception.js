/* ===== CLINIC ERP — RECEPTION MODULE ===== */

const Reception = (() => {
    let currentFilter = 'daily';

    /* --- Initialize Booking Form --- */
    function initBookingForm() {
        const form = document.getElementById('booking-form');
        const dateInput = document.getElementById('b-date');
        const phoneInput = document.getElementById('b-phone');

        // Set default date to today
        if (dateInput && !dateInput.value) {
            dateInput.value = Utils.todayISO();
        }

        const nameInput = document.getElementById('b-name');
        
        // Name and phone blur → auto-fill returning patient
        if (phoneInput) {
            phoneInput.removeEventListener('blur', handlePhoneLookup);
            phoneInput.addEventListener('blur', handlePhoneLookup);
        }
        if (nameInput) {
            nameInput.removeEventListener('blur', handlePhoneLookup);
            nameInput.addEventListener('blur', handlePhoneLookup);
        }

        // Form submit
        if (form) {
            form.removeEventListener('submit', handleBookingSubmit);
            form.addEventListener('submit', handleBookingSubmit);
        }
    }

    /* --- Phone Lookup for Returning Patients --- */
    async function handlePhoneLookup() {
        const phoneInput = document.getElementById('b-phone');
        const nameInput = document.getElementById('b-name');
        
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const name = nameInput ? nameInput.value.trim() : '';

        if (phone.length < 10 || !name) {
            hideBookingStatus();
            if (document.getElementById('b-fee')) {
                document.getElementById('b-fee').value = 300;
            }
            return;
        }

        const statusEl = document.getElementById('booking-status');
        
        // Fetch patient from backend using API
        const patient = await API.patients.find(phone);

        if (patient && (patient.Name || patient.name || '').toLowerCase().trim() === name.toLowerCase()) {
            // Check recent appointments for free visit eligibility
            const allRecords = API.getCache('allRecords') || [];
            const oldPid = patient.PatientID || patient.patientId || patient['Patient ID'];
            
            const matches = allRecords.filter(r =>
                (r.PatientID || r.patientId) === oldPid || 
                (r.Phone || r.phone || '').toString() === phone
            );
            
            matches.sort((a, b) =>
                new Date(b.Timestamp || b.createdAt || b.CreatedAt || 0) - new Date(a.Timestamp || a.createdAt || a.CreatedAt || 0)
            );

            let latest = matches.length > 0 ? matches[0] : patient;

            // Auto-fill fields if empty
            const fill = (id, val) => {
                const el = document.getElementById(id);
                if (el && !el.value && val) el.value = val;
            };

            fill('b-age', latest.age || latest.Age);
            fill('b-gender', latest.gender || latest.Gender);
            fill('b-address', latest.address || latest.Address);
            fill('b-weight', latest.weight || latest.Weight);

            if (oldPid) document.getElementById('b-pid').value = oldPid;

            // Check if within 5-day free visit window
            const validStr = latest.validTill || latest['Valid Till'];
            let isFree = false;
            if (validStr) {
                const parts = validStr.split('/');
                if (parts.length === 3) {
                    const validDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (validDate >= today) isFree = true;
                }
            }

            const feeInput = document.getElementById('b-fee');
            if (isFree) {
                feeInput.value = 0;
                showBookingStatus('success',
                    `<i class="ph ph-check-circle"></i> <strong>Returning Patient (Visit #${matches.length + 1})</strong>: Previous prescription still valid. Fee waived.`
                );
            } else {
                feeInput.value = 300;
                showBookingStatus('info',
                    `<i class="ph ph-info"></i> <strong>Returning Patient (Visit #${matches.length + 1})</strong>: Details auto-filled. Standard fee applies.`
                );
            }
        } else {
            hideBookingStatus();
            document.getElementById('b-fee').value = 300;
        }
    }

    /* --- Show/Hide Booking Status Message --- */
    function showBookingStatus(type, html) {
        const el = document.getElementById('booking-status');
        if (!el) return;
        const colors = {
            success: { bg: 'var(--success-light)', color: 'var(--success)', border: '#bbf7d0' },
            info: { bg: 'var(--info-light)', color: 'var(--info)', border: '#bae6fd' },
            warning: { bg: 'var(--warning-light)', color: 'var(--warning)', border: '#fde68a' },
            error: { bg: 'var(--danger-light)', color: 'var(--danger)', border: '#fecaca' }
        };
        const c = colors[type] || colors.info;
        el.style.cssText = `padding: 0.75rem 1rem; border-radius: var(--radius-md); background: ${c.bg}; color: ${c.color}; border: 1px solid ${c.border}; font-size: 0.88rem; font-weight: 500;`;
        el.innerHTML = html;
        el.classList.remove('hidden');
    }

    function hideBookingStatus() {
        const el = document.getElementById('booking-status');
        if (el) el.classList.add('hidden');
    }

    /* --- Handle Booking Submit --- */
    async function handleBookingSubmit(e) {
        e.preventDefault();

        const errors = Utils.validateRequired([
            { id: 'b-phone', label: 'Phone' },
            { id: 'b-name', label: 'Name' },
            { id: 'b-age', label: 'Age' },
            { id: 'b-gender', label: 'Gender' },
            { id: 'b-address', label: 'Address' },
            { id: 'b-specialty', label: 'Specialty' },
            { id: 'b-date', label: 'Date' },
            { id: 'b-fee', label: 'Fee' }
        ]);

        if (errors.length > 0) {
            Utils.showToast(errors[0], 'error');
            return;
        }

        const phone = document.getElementById('b-phone').value.trim();
        if (!Utils.validatePhone(phone)) {
            Utils.showToast('Please enter a valid 10-digit phone number.', 'error');
            return;
        }

        // Generate IDs
        const appointmentId = Utils.generateId('APT');
        let patientId = document.getElementById('b-pid').value.trim();
        if (!patientId) {
            patientId = Utils.generateId('PID');
            document.getElementById('b-pid').value = patientId;
        }

        const today = new Date();
        const validDate = new Date(today);
        validDate.setDate(today.getDate() + 5);

        const specialty = document.getElementById('b-specialty').value;

        // Find a doctor for this specialty
        const assignedDoctor = assignDoctorBySpecialty(specialty);

        const allRecords = API.getCache('allRecords') || [];
        const name = document.getElementById('b-name').value.trim();
        const visitCount = allRecords.filter(r =>
            (r.phone || r.Phone || '').toString() === phone &&
            (r.name || r.Name || '').toLowerCase().trim() === name.toLowerCase()
        ).length + 1;

        const bookingData = {
            appointmentId,
            patientId,
            name: document.getElementById('b-name').value.trim(),
            age: document.getElementById('b-age').value,
            gender: document.getElementById('b-gender').value,
            phone,
            address: document.getElementById('b-address').value.trim(),
            weight: document.getElementById('b-weight').value || '',
            symptoms: document.getElementById('b-symptoms').value.trim() || 'None',
            specialty,
            doctorId: assignedDoctor ? assignedDoctor.username : '',
            doctorName: assignedDoctor ? assignedDoctor.name : '',
            fee: document.getElementById('b-fee').value,
            appointmentDate: document.getElementById('b-date').value,
            appointmentTime: document.getElementById('b-time').value || '',
            status: 'assigned',
            bookedBy: App.getCurrentUser()?.username || 'reception',
            visitCount,
            validTill: validDate.toLocaleDateString('en-GB')
        };

        // Disable submit button
        const btn = document.getElementById('btn-book');
        const origText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Booking...';
        btn.disabled = true;

        try {
            await API.appointments.create(bookingData);
            Utils.showToast(`Appointment booked! ID: ${appointmentId}`, 'success');

            // Reset form
            document.getElementById('booking-form').reset();
            document.getElementById('b-date').value = Utils.todayISO();
            document.getElementById('b-fee').value = 300;
            document.getElementById('b-pid').value = '';
            hideBookingStatus();

            // Refresh dashboard
            if (typeof Dashboard !== 'undefined') Dashboard.load();
        } catch (err) {
            Utils.showToast('Booking failed. Please try again.', 'error');
        }

        btn.innerHTML = origText;
        btn.disabled = false;
    }

    /* --- Assign Doctor by Specialty --- */
    function assignDoctorBySpecialty(specialty) {
        const doctors = App.STATIC_USERS.filter(u =>
            u.role === 'doctor' && (u.specialty === specialty || u.specialty === 'general')
        );

        // Prefer exact specialty match
        const exact = doctors.find(d => d.specialty === specialty);
        if (exact) return exact;

        // Fallback to general
        const general = doctors.find(d => d.specialty === 'general');
        return general || doctors[0] || null;
    }

    /* --- Load Appointments List --- */
    async function loadAppointments(filter) {
        if (filter) currentFilter = filter;
        
        const container = document.getElementById('appointments-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="spinner" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary);"></span>
                    <p>Loading appointments...</p>
                </div>`;
        }

        await API.appointments.list();
        
        const records = API.getCache('allRecords') || [];
        renderAppointments(records, currentFilter);
    }

    /* --- Filter Appointments --- */
    function filterAppointments(filter, btnEl) {
        currentFilter = filter;

        // Update active tab
        Utils.$all('#appointments .filter-tab').forEach(t => t.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');

        loadAppointments(filter);
    }

    /* --- Render Appointments Table --- */
    function renderAppointments(records, filter) {
        const tbody = document.querySelector('#appointments-table tbody');
        if (!tbody) return;

        let filtered = records.filter(r => {
            const ts = r.Timestamp || r.createdAt;
            if (!ts) return false;
            if (filter === 'daily') return Utils.isToday(ts);
            if (filter === 'weekly') return Utils.isThisWeek(ts);
            if (filter === 'monthly') return Utils.isThisMonth(ts);
            return true;
        });

        // Sort newest first
        filtered.sort((a, b) =>
            new Date(b.Timestamp || b.createdAt) - new Date(a.Timestamp || a.createdAt)
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="table-empty">
                <i class="ph ph-calendar-blank"></i>No appointments found for this period.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const aptId = r.appointmentId || r.AppointmentID || r['Appointment ID'] || '-';
            const name = r.name || r.Name || '-';
            const phone = r.phone || r.Phone || '-';
            const age = r.age || r.Age || '-';
            const gender = Utils.genderShort(r.gender || r.Gender);
            const specialty = Utils.capitalize(r.specialty || r.Specialty || '-');
            const status = r.status || r.Status || 'booked';
            const date = Utils.formatDate(r.Timestamp || r.createdAt);

            return `<tr>
                <td><strong>${Utils.escapeHtml(aptId)}</strong></td>
                <td>${Utils.escapeHtml(name)}</td>
                <td>${phone}</td>
                <td>${age} / ${gender}</td>
                <td><span class="badge badge-purple">${specialty}</span></td>
                <td>${Utils.statusBadge(status)}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="PrintModule.printFromRecord('${aptId}')" title="Print">
                        <i class="ph ph-printer"></i>
                    </button>
                    <button class="btn btn-sm btn-ghost" onclick="Reception.viewDetails('${aptId}')" title="View">
                        <i class="ph ph-eye"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    /* --- View Appointment Details (Modal) --- */
    function viewDetails(aptId) {
        const records = API.getCache('allRecords') || [];
        const r = records.find(x => (x.appointmentId || x.AppointmentID || x['Appointment ID']) === aptId);
        if (!r) return Utils.showToast('Record not found.', 'error');

        const html = `
            <div class="form-row form-row-2">
                <div class="form-group"><label>Appointment ID</label><div class="form-control" style="background:var(--bg-alt)">${r.appointmentId || r.AppointmentID || r['Appointment ID']}</div></div>
                <div class="form-group"><label>Patient ID</label><div class="form-control" style="background:var(--bg-alt)">${r.patientId || r.PatientID || r['Patient ID'] || '-'}</div></div>
            </div>
            <div class="form-row form-row-3">
                <div class="form-group"><label>Name</label><div class="form-control" style="background:var(--bg-alt)">${r.name || r.Name}</div></div>
                <div class="form-group"><label>Age</label><div class="form-control" style="background:var(--bg-alt)">${r.age || r.Age}</div></div>
                <div class="form-group"><label>Gender</label><div class="form-control" style="background:var(--bg-alt)">${r.gender || r.Gender}</div></div>
            </div>
            <div class="form-row form-row-2">
                <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg-alt)">${r.phone || r.Phone}</div></div>
                <div class="form-group"><label>Specialty</label><div class="form-control" style="background:var(--bg-alt)">${Utils.capitalize(r.specialty || r.Specialty || '-')}</div></div>
            </div>
            <div class="form-group"><label>Symptoms</label><div class="form-control" style="background:var(--bg-alt); min-height: 60px">${r.symptoms || r.Symptoms || 'None'}</div></div>
            <div class="form-row form-row-2">
                <div class="form-group"><label>Status</label><div>${Utils.statusBadge(r.status || r.Status || 'booked')}</div></div>
                <div class="form-group"><label>Doctor</label><div class="form-control" style="background:var(--bg-alt)">${r.doctorName || r.DoctorName || 'Not assigned'}</div></div>
            </div>
        `;

        openModal('Appointment Details', html, `
            <button class="btn btn-outline" onclick="closeModal()">Close</button>
            <button class="btn btn-primary" onclick="PrintModule.printFromRecord('${aptId}'); closeModal();">
                <i class="ph ph-printer"></i> Print
            </button>
        `);
    }

    return {
        initBookingForm,
        loadAppointments,
        filterAppointments,
        viewDetails
    };
})();
