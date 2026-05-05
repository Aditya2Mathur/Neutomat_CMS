/* ===== CLINIC ERP — ADMIN MODULE ===== */

const Admin = (() => {

    /* --- Load Users --- */
    function loadUsers() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;

        const users = App.STATIC_USERS;
        tbody.innerHTML = users.map(u => {
            const roleColors = {
                reception: 'badge-green',
                doctor: 'badge-purple',
                pharmacy: 'badge-orange',
                admin: 'badge-gray'
            };
            return `<tr>
                <td><strong>${Utils.escapeHtml(u.name)}</strong></td>
                <td><code style="background:var(--bg-alt); padding:2px 8px; border-radius:4px; font-size:0.82rem;">${u.username}</code></td>
                <td><span class="badge ${roleColors[u.role] || 'badge-gray'}">${Utils.capitalize(u.role)}</span></td>
                <td>${u.specialty ? Utils.capitalize(u.specialty) : '-'}</td>
                <td><span class="badge badge-green">Active</span></td>
            </tr>`;
        }).join('');
    }

    /* --- Show Add User Modal --- */
    function showAddUserModal() {
        const html = `
            <div class="form-group mb-2">
                <label>Full Name <span class="required">*</span></label>
                <input type="text" id="new-user-name" class="form-control" placeholder="Dr. John Doe">
            </div>
            <div class="form-row form-row-2">
                <div class="form-group">
                    <label>Username <span class="required">*</span></label>
                    <input type="text" id="new-user-username" class="form-control" placeholder="johndoe">
                </div>
                <div class="form-group">
                    <label>Password <span class="required">*</span></label>
                    <input type="text" id="new-user-password" class="form-control" placeholder="Enter password">
                </div>
            </div>
            <div class="form-row form-row-2">
                <div class="form-group">
                    <label>Role <span class="required">*</span></label>
                    <select id="new-user-role" class="form-control" onchange="Admin.toggleSpecialtyField()">
                        <option value="reception">Reception</option>
                        <option value="doctor">Doctor</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div class="form-group" id="specialty-field-group" style="display:none;">
                    <label>Specialty</label>
                    <select id="new-user-specialty" class="form-control">
                        <option value="neuro">Neuro Surgeon</option>
                        <option value="gynecologist">Gynecology</option>
                    </select>
                </div>
            </div>
            <div class="form-hint" style="margin-top: 0.5rem;">
                <i class="ph ph-info"></i> In the current version, new users are added to the static list and will persist until page refresh.
                For permanent users, add them to the Google Sheet <strong>Users</strong> tab and update <code>STATIC_USERS</code> in app.js.
            </div>
        `;

        openModal('Add User', html, `
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="Admin.addUser()">
                <i class="ph ph-user-plus"></i> Add User
            </button>
        `);
    }

    /* --- Toggle Specialty Field --- */
    function toggleSpecialtyField() {
        const role = document.getElementById('new-user-role').value;
        const specField = document.getElementById('specialty-field-group');
        if (specField) {
            specField.style.display = role === 'doctor' ? '' : 'none';
        }
    }

    /* --- Add User --- */
    function addUser() {
        const name = document.getElementById('new-user-name').value.trim();
        const username = document.getElementById('new-user-username').value.trim().toLowerCase();
        const password = document.getElementById('new-user-password').value;
        const role = document.getElementById('new-user-role').value;
        const specialty = role === 'doctor' ? document.getElementById('new-user-specialty').value : null;

        if (!name || !username || !password) {
            Utils.showToast('Name, username, and password are required.', 'error');
            return;
        }

        // Check duplicate
        if (App.STATIC_USERS.find(u => u.username === username)) {
            Utils.showToast('Username already exists.', 'error');
            return;
        }

        App.STATIC_USERS.push({ username, password, role, name, specialty });
        Utils.showToast(`User "${name}" added successfully!`, 'success');
        closeModal();
        loadUsers();
    }

    /* --- Save Settings --- */
    function saveSettings() {
        const settings = {
            clinicName: document.getElementById('setting-clinic-name').value.trim(),
            clinicAddress: document.getElementById('setting-clinic-address').value.trim(),
            clinicPhone: document.getElementById('setting-clinic-phone').value.trim(),
            supabaseUrl: document.getElementById('setting-supabase-url') ? document.getElementById('setting-supabase-url').value.trim() : '',
            supabaseKey: document.getElementById('setting-supabase-key') ? document.getElementById('setting-supabase-key').value.trim() : '',
            defaultFee: document.getElementById('setting-default-fee').value
        };

        Utils.store('clinic_erp_settings', settings);
        
        // Re-initialize Supabase connection
        if (typeof API !== 'undefined' && API.initSupabase) {
            API.initSupabase();
        }

        Utils.showToast('Settings saved successfully!', 'success');

        // Update sidebar title
        if (settings.clinicName) {
            const headerH2 = Utils.$('.sidebar-header h2');
            if (headerH2) headerH2.textContent = settings.clinicName;
        }
    }

    /* --- Seed Demo Data --- */
    async function seedDemoData() {
        const btn = document.getElementById('btn-seed-data');
        if (btn) {
            btn.innerHTML = '<span class="spinner" style="font-size:0.8rem; vertical-align:middle; margin-right:4px;"></span> Seeding...';
            btn.disabled = true;
        }

        try {
            // Seed Demo Inventory
            const demoMed = [
                { medicineId: 'MED-001', name: 'Paracetamol 500mg', category: 'Tablet', stock: 250, unit: 'strips', minStock: 20, price: 25 },
                { medicineId: 'MED-002', name: 'Amoxicillin 500mg', category: 'Capsule', stock: 150, unit: 'strips', minStock: 15, price: 45 },
                { medicineId: 'MED-003', name: 'Cetirizine 10mg', category: 'Tablet', stock: 200, unit: 'strips', minStock: 20, price: 15 },
                { medicineId: 'MED-005', name: 'Cough Syrup (Benadryl)', category: 'Syrup', stock: 80, unit: 'bottles', minStock: 10, price: 85 },
                { medicineId: 'MED-009', name: 'Betadine Ointment', category: 'Ointment', stock: 45, unit: 'tubes', minStock: 5, price: 55 }
            ];

            for (const med of demoMed) {
                await API.inventory.add(med);
            }

            // Seed Demo Patients
            const demoPatients = [
                { patientId: 'PID-DEMO1', name: 'Ramesh Kumar', age: 45, gender: 'Male', phone: '9876543210', address: 'Delhi', weight: 70 },
                { patientId: 'PID-DEMO2', name: 'Sunita Sharma', age: 34, gender: 'Female', phone: '9876543211', address: 'Mumbai', weight: 60 },
                { patientId: 'PID-DEMO3', name: 'Alok Singh', age: 28, gender: 'Male', phone: '9876543212', address: 'Pune', weight: 82 }
            ];

            for (const patient of demoPatients) {
                await API.patients.create(patient);
            }

            Utils.showToast('Demo data seeded successfully! Please refresh.', 'success');

            // Refresh
            await API.refreshAll();

        } catch (err) {
            Utils.showToast('Failed to seed demo data', 'error');
        }

        if (btn) {
            btn.innerHTML = '<i class="ph ph-database"></i> Seed Demo Data';
            btn.disabled = false;
        }
    }

    /* --- Load Settings --- */
    function loadSettings() {
        const settings = Utils.retrieve('clinic_erp_settings');
        if (!settings) return;

        if (settings.clinicName) {
            const el = document.getElementById('setting-clinic-name');
            if (el) el.value = settings.clinicName;
        }
        if (settings.clinicAddress) {
            const el = document.getElementById('setting-clinic-address');
            if (el) el.value = settings.clinicAddress;
        }
        if (settings.clinicPhone) {
            const el = document.getElementById('setting-clinic-phone');
            if (el) el.value = settings.clinicPhone;
        }
        if (settings.supabaseUrl) {
            const el = document.getElementById('setting-supabase-url');
            if (el) el.value = settings.supabaseUrl;
        }
        if (settings.supabaseKey) {
            const el = document.getElementById('setting-supabase-key');
            if (el) el.value = settings.supabaseKey;
        }
        if (settings.defaultFee) {
            const el = document.getElementById('setting-default-fee');
            if (el) el.value = settings.defaultFee;
        }
    }

    /* --- Initialize on page load --- */
    document.addEventListener('DOMContentLoaded', () => {
        loadSettings();

        // Auto-load users when navigating to Users page
        const observer = new MutationObserver(() => {
            const usersSection = document.getElementById('users');
            if (usersSection && !usersSection.classList.contains('hidden')) {
                loadUsers();
            }
        });

        const usersSection = document.getElementById('users');
        if (usersSection) {
            observer.observe(usersSection, { attributes: true, attributeFilter: ['class'] });
        }
    });

    return {
        loadUsers,
        showAddUserModal,
        toggleSpecialtyField,
        addUser,
        saveSettings,
        loadSettings,
        seedDemoData
    };
})();
