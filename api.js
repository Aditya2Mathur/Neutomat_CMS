/* ===== CLINIC ERP — API LAYER (SUPABASE MIGRATION) ===== */

const API = (() => {
    /* --- Supabase Initialization --- */
    let supabase = null;

    function initSupabase() {
        try {
            const settings = JSON.parse(localStorage.getItem('clinic_erp_settings')) || {};
            const url = settings.supabaseUrl || 'https://fukuikzuyiobtrnwlhji.supabase.co';
            const key = settings.supabaseKey || 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B';
            
            if (window.supabase) {
                supabase = window.supabase.createClient(url, key);
            }
        } catch (e) { /* ignore */ }
    }
    
    // Initial call
    initSupabase();

    /* --- Cache & Offline Queue --- */
    const CACHE_PREFIX = 'clinic_erp_cache_';
    const OFFLINE_QUEUE_KEY = 'clinic_erp_offline_queue';

    function getCache(key) {
        return Utils.retrieve(CACHE_PREFIX + key);
    }

    function setCache(key, data) {
        Utils.store(CACHE_PREFIX + key, data);
    }

    function getOfflineQueue() {
        return Utils.retrieve(OFFLINE_QUEUE_KEY) || [];
    }

    function addToOfflineQueue(table, action, data) {
        const queue = getOfflineQueue();
        queue.push({ table, action, data, queuedAt: Utils.nowISO() });
        Utils.store(OFFLINE_QUEUE_KEY, queue);
    }

    /* --- Offline Sync --- */
    async function processOfflineQueue() {
        if (!navigator.onLine || !supabase) return;

        const queue = getOfflineQueue();
        if (queue.length === 0) return;

        const remaining = [];
        let synced = 0;

        for (const item of queue) {
            try {
                if (item.action === 'insert') {
                    const { error } = await supabase.from(item.table).insert([item.data]);
                    if (error) throw error;
                } else if (item.action === 'upsert') {
                    let conflictKey = 'PatientID';
                    if (item.table === 'Appointments') conflictKey = 'AppointmentID';
                    const { error } = await supabase.from(item.table).upsert([item.data], { onConflict: conflictKey });
                    if (error) throw error;
                } else if (item.action === 'update' && item.table === 'Appointments') {
                    const { error } = await supabase.from(item.table).update(item.data).eq('AppointmentID', item.data.AppointmentID);
                    if (error) throw error;
                } else if (item.action === 'update' && item.table === 'Prescriptions') {
                    const { error } = await supabase.from(item.table).update(item.data).eq('PrescriptionID', item.data.PrescriptionID);
                    if (error) throw error;
                }
                synced++;
            } catch (e) {
                console.warn('Sync failed for item', item, e);
                remaining.push(item);
            }
        }

        Utils.store(OFFLINE_QUEUE_KEY, remaining);

        if (synced > 0) {
            Utils.showToast(`Synced ${synced} offline record(s) successfully!`, 'success');
        }
    }

    window.addEventListener('online', processOfflineQueue);

    /* --- Helper to check auth --- */
    function checkSupabase() {
        if (!supabase) {
            initSupabase();
            if (!supabase) {
                Utils.showToast('Supabase not connected. Please configure in Settings.', 'error');
                return false;
            }
        }
        return true;
    }

    /* --- Merge helper: merges remote + local by unique key --- */
    function mergeRecords(local, remote, keyField) {
        if (!remote || !Array.isArray(remote)) return local || [];
        if (!local || local.length === 0) return remote;

        const merged = new Map();
        const offlineQueue = getOfflineQueue() || [];

        // Add all remote records (authoritative)
        remote.forEach(r => {
            const id = r[keyField];
            if (id) merged.set(id, r);
        });

        // Add local-only records (not yet in remote) BUT only keep if they are pending in offline queue
        local.forEach(r => {
            const id = r[keyField];
            const isPendingOffline = offlineQueue.some(item => 
                 item.data && (item.data.AppointmentID === id || item.data.PrescriptionID === id || item.data.PatientID === id)
            );

            if (id && !merged.has(id)) {
                if (isPendingOffline) {
                    merged.set(id, r);
                }
            } else if (id && merged.has(id)) {
                // Keep local status if there's a pending update
                const remoteRecord = merged.get(id);
                const localStatus = r.Status;
                const remoteStatus = remoteRecord.Status;
                
                const isStatusPending = offlineQueue.some(item => 
                    item.data && (item.data.AppointmentID === id || item.data.PrescriptionID === id) && item.data.Status
                );

                if (localStatus && localStatus !== remoteStatus && (isStatusPending || localStatus === 'dispensed' || localStatus === 'completed')) {
                    merged.set(id, { ...remoteRecord, Status: localStatus });
                }
            }
        });

        return Array.from(merged.values());
    }

    /* --- Helper to Map camelCase to PascalCase --- */
    function mapPayload(data) {
        const out = {};
        for (let k in data) {
            let pKey = k;
            if (k === 'appointmentId') pKey = 'AppointmentID';
            else if (k === 'patientId') pKey = 'PatientID';
            else if (k === 'doctorId') pKey = 'DoctorID';
            else if (k === 'prescriptionId') pKey = 'PrescriptionID';
            else if (k === 'dispenseId') pKey = 'DispenseID';
            else if (k === 'medicineId') pKey = 'MedicineID';
            else if (k === 'minStock') pKey = 'MinStock';
            else if (k === 'doctorName') pKey = 'DoctorName';
             else if (k === 'totalAmount') pKey = 'TotalAmount';
             else if (k === 'lastUpdated') pKey = 'LastUpdated';
            else if (k === 'createdAt') pKey = 'CreatedAt';
            else if (k.match(/^[a-z]/)) pKey = k.charAt(0).toUpperCase() + k.slice(1);
            
            // Convert empty strings to null for strict PostgreSQL typing
            if (data[k] === '') {
                out[pKey] = null;
            } else {
                out[pKey] = data[k];
            }
        }
        return out;
    }

    /* ========== DOMAIN APIs ========== */

    /* --- Authentication --- */
    const auth = {
        async login(username, passwordHash) {
            if (!checkSupabase()) return null;
            
            const { data, error } = await supabase
                .from('Users')
                .select('*')
                .eq('Username', username)
                .single();
                
            if (error || !data) return { success: false, error: 'User not found' };
            if (data.PasswordHash === passwordHash) {
                return { success: true, user: data, role: data.Role };
            }
            return { success: false, error: 'Invalid password' };
        },

        async getUsers() {
            if (!checkSupabase()) return getCache('users') || [];
            const { data, error } = await supabase.from('Users').select('*');
            if (error) return getCache('users') || [];
            if (data) setCache('users', data);
            return data;
        }
    };

    /* --- Patients --- */
    const patients = {
        async find(phone) {
            const allData = getCache('patients') || [];
            const matches = allData.filter(r => (r.Phone || '').toString() === phone.toString());
            if (matches.length > 0) {
                matches.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
                return matches[0];
            }

            if (!checkSupabase()) return null;
            const { data, error } = await supabase
                .from('Patients')
                .select('*')
                .eq('Phone', phone)
                .order('CreatedAt', { ascending: false })
                .limit(1);
            return data && data[0] ? data[0] : null;
        },

        async create(data) {
            const mapped = mapPayload(data);
            if (!checkSupabase()) {
                addToOfflineQueue('Patients', 'insert', mapped);
                return { success: false, offline: true };
            }
            
            const { error } = await supabase.from('Patients').insert([mapped]);
            if (error) {
                console.warn('Patient creation failed:', error);
                addToOfflineQueue('Patients', 'insert', mapped);
                return { success: false, offline: true };
            }
            return { success: true, data: mapped };
        },

        async getAll() {
            if (!checkSupabase()) return getCache('patients') || [];
            const { data, error } = await supabase.from('Patients').select('*');
            if (data) setCache('patients', data);
            return data || getCache('patients') || [];
        }
    };

    /* --- Appointments --- */
    const appointments = {
        async create(data) {
            const mappedAppt = mapPayload({ ...data, Timestamp: Utils.nowISO() });
            
            // Ensure numerics
            mappedAppt.Age = mappedAppt.Age ? Number(mappedAppt.Age) : null;
            mappedAppt.Fee = mappedAppt.Fee ? Number(mappedAppt.Fee) : 0;
            mappedAppt.VisitCount = mappedAppt.VisitCount ? Number(mappedAppt.VisitCount) : 1;

            // Map the patient payload to automatically create/upsert the patient first
            const mappedPatient = mapPayload({
                patientId: mappedAppt.PatientID || data.patientId || Utils.generateId('PID'),
                name: data.name,
                age: data.age ? Number(data.age) : null,
                gender: data.gender,
                phone: data.phone,
                address: data.address,
                weight: data.weight,
                createdAt: Utils.nowISO(),
                lastVisit: Utils.nowISO()
            });

            // Ensure the appointment uses the generated PatientID
            mappedAppt.PatientID = mappedPatient.PatientID;

            // Update local cache optimistically
            const cached = getCache('allRecords') || [];
            cached.push(mappedAppt);
            setCache('allRecords', cached);

            if (!checkSupabase()) {
                addToOfflineQueue('Patients', 'upsert', mappedPatient);
                addToOfflineQueue('Appointments', 'insert', mappedAppt);
                return { success: true, offline: true }; // Optmistic success
            }
            
            // 1. Upsert Patient
            const { error: patientErr } = await supabase.from('Patients').upsert([mappedPatient], { onConflict: 'PatientID' });
            if (patientErr) console.error("Patient Upsert Failed:", patientErr);

            // 2. Insert Appointment
            const { error } = await supabase.from('Appointments').insert([mappedAppt]);
            if (error) {
                console.error("Booking failed:", error);
                addToOfflineQueue('Appointments', 'insert', mappedAppt);
                return { success: true, offline: true };
            }
            return { success: true, data: mappedAppt };
        },

        async list(filters = {}) {
            const cached = getCache('allRecords') || [];
            if (!checkSupabase()) return cached;
            
            let query = supabase.from('Appointments').select('*');
            const { data, error } = await query;
            if (data) {
                const merged = mergeRecords(cached, data, 'AppointmentID');
                setCache('allRecords', merged);
                return merged;
            }
            return cached;
        },

        getCached() {
            return getCache('allRecords') || [];
        },

        async update(appointmentId, data) {
            let updatePayload = mapPayload(data);
            if (updatePayload.AppointmentId) {
                updatePayload.AppointmentID = updatePayload.AppointmentId;
                delete updatePayload.AppointmentId;
            } else if (!updatePayload.AppointmentID) {
                updatePayload.AppointmentID = appointmentId;
            }

            if (!checkSupabase()) {
                addToOfflineQueue('Appointments', 'update', updatePayload);
                return { success: true, offline: true };
            }

            const { error } = await supabase.from('Appointments').update(updatePayload).eq('AppointmentID', appointmentId);
            if (error) {
                addToOfflineQueue('Appointments', 'update', updatePayload);
                return { success: true, offline: true };
            }
            return { success: true };
        },

        async getByDoctor(doctorId, status) {
            const all = this.getCached();
            return all.filter(a =>
                (a.DoctorID === doctorId) &&
                (!status || a.Status === status)
            );
        },

        async getByStatus(status) {
            const all = this.getCached();
            return all.filter(a => a.Status === status);
        }
    };

    /* --- Prescriptions --- */
    const prescriptions = {
        async save(data) {
            const mapped = mapPayload({ ...data, CreatedAt: Utils.nowISO() });

            // Update local cache
            const cached = getCache('prescriptions') || [];
            cached.push(mapped);
            setCache('prescriptions', cached);

            if (!checkSupabase()) {
                addToOfflineQueue('Prescriptions', 'insert', mapped);
                return { success: true, offline: true };
            }
            
            const { error } = await supabase.from('Prescriptions').insert([mapped]);
            if (error) {
                addToOfflineQueue('Prescriptions', 'insert', mapped);
                return { success: true, offline: true };
            }
            return { success: true, data: mapped };
        },

        async getById(prescriptionId) {
            const all = getCache('prescriptions') || [];
            const found = all.find(p => p.PrescriptionID === prescriptionId);
            if (found) return found;

            if (!checkSupabase()) return null;
            const { data, error } = await supabase.from('Prescriptions').select('*').eq('PrescriptionID', prescriptionId).single();
            return data;
        },

        async list(filters = {}) {
            const cached = getCache('prescriptions') || [];
            if (!checkSupabase()) return cached;
            
            const { data, error } = await supabase.from('Prescriptions').select('*');
            if (data) {
                const merged = mergeRecords(cached, data, 'PrescriptionID');
                setCache('prescriptions', merged);
                return merged;
            }
            return cached;
        },

        getCached() {
            return getCache('prescriptions') || [];
        },

        async updateStatus(prescriptionId, status) {
            const updatePayload = { PrescriptionID: prescriptionId, Status: status };
            if (status === 'dispensed') {
                 updatePayload.CompletedAt = Utils.nowISO();
            }

            if (!checkSupabase()) {
                addToOfflineQueue('Prescriptions', 'update', updatePayload);
                return { success: true, offline: true };
            }

            const { error } = await supabase.from('Prescriptions').update(updatePayload).eq('PrescriptionID', prescriptionId);
            if (error) {
                addToOfflineQueue('Prescriptions', 'update', updatePayload);
                return { success: true, offline: true };
            }
            return { success: true };
        },

        async getByAppointment(appointmentId) {
            const all = this.getCached();
            return all.find(p => p.AppointmentID === appointmentId);
        }
    };

    /* --- Pharmacy --- */
    const pharmacy = {
        async getQueue() {
            const all = await prescriptions.list();
            return all.filter(p => p.Status === 'sent_to_pharmacy');
        },

        async dispense(prescriptionId, items) {
            // Update local cache status
            const cached = getCache('prescriptions') || [];
            const idx = cached.findIndex(p => p.PrescriptionID === prescriptionId);
            if (idx >= 0) {
                cached[idx].Status = 'dispensed';
                setCache('prescriptions', cached);
            }

            const data = {
                DispenseID: 'DISP-' + Date.now(),
                PrescriptionID: prescriptionId,
                Medicines: items,
                Status: 'dispensed',
                Timestamp: Utils.nowISO()
            };

            await prescriptions.updateStatus(prescriptionId, 'dispensed');

            if (!checkSupabase()) {
                addToOfflineQueue('DispenseLog', 'insert', data);
                return { success: true, offline: true };
            }

            const { error } = await supabase.from('DispenseLog').insert([data]);
            if (error) {
                 addToOfflineQueue('DispenseLog', 'insert', data);
                 return { success: true, offline: true };
            }
            return { success: true };
        },

        async getDispensedToday() {
            const all = await prescriptions.list();
            return all.filter(p => p.Status === 'dispensed' && Utils.isToday(p.CompletedAt || p.CreatedAt));
        }
    };

    /* --- Inventory --- */
    const inventory = {
        async list() {
            if (!checkSupabase()) return getCache('inventory') || [];
            const { data, error } = await supabase.from('Inventory').select('*');
            if (data) {
                setCache('inventory', data);
                return data;
            }
            return getCache('inventory') || [];
        },

        async update(medicineId, stock) {
            const cached = getCache('inventory') || [];
            const idx = cached.findIndex(m => m.MedicineID === medicineId);
            if (idx >= 0) {
                cached[idx].Stock = stock;
                cached[idx].LastUpdated = Utils.nowISO();
                setCache('inventory', cached);
            }

            if (!checkSupabase()) return { success: false, offline: true };
            const { error } = await supabase.from('Inventory').update({ Stock: stock, LastUpdated: Utils.nowISO() }).eq('MedicineID', medicineId);
            return { success: !error };
        },

        async add(data) {
            const mapped = mapPayload(data);
            
            const cached = getCache('inventory') || [];
            cached.push(mapped);
            setCache('inventory', cached);

            if (!checkSupabase()) return { success: false, offline: true };
            const { error } = await supabase.from('Inventory').insert([mapped]);
            return { success: !error };
        },

        async getLowStock() {
            const all = await this.list();
            return all.filter(m => parseInt(m.Stock || 0) <= parseInt(m.MinStock || 10));
        }
    };

    /* --- Dashboard / Stats (reads cache directly) --- */
    const dashboard = {
        async getStats(role, userId) {
            const all = appointments.getCached();

            const today = new Date().toLocaleDateString('en-GB');
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            let daily = 0, weekly = 0, monthly = 0, totalFee = 0;

            all.forEach(record => {
                const ts = record.Timestamp || record.CreatedAt;
                if (!ts) return;
                const rDate = new Date(ts);

                if (rDate.toLocaleDateString('en-GB') === today) {
                    daily++;
                    totalFee += parseFloat(record.Fee || 0);
                }
                if (rDate >= weekAgo) weekly++;
                if (rDate >= monthAgo) monthly++;
            });

            return { daily, weekly, monthly, totalFee, total: all.length };
        },

        async getChartData() {
            const all = appointments.getCached();
            const dateCounts = {};

            all.forEach(record => {
                const ts = record.Timestamp || record.CreatedAt;
                if (!ts) return;
                const d = new Date(ts);
                const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                dateCounts[key] = (dateCounts[key] || 0) + 1;
            });

            const sorted = Object.keys(dateCounts)
                .sort((a, b) => new Date(a) - new Date(b))
                .slice(-7);

            return {
                labels: sorted,
                data: sorted.map(d => dateCounts[d])
            };
        }
    };

    /* --- Audit --- */
    const audit = {
        async log(userId, action, entityType, entityId, details = '') {
            if (!checkSupabase()) return { success: false };
            const { error } = await supabase.from('AuditLog').insert([{
                LogID: 'LOG-' + Date.now(),
                UserAccount: userId,
                Action: action,
                Entity: entityType,
                EntityID: entityId,
                Details: details
            }]);
            return { success: !error };
        },

        async getLog(limit = 50) {
            if (!checkSupabase()) return [];
            const { data } = await supabase.from('AuditLog').select('*').order('Timestamp', { ascending: false }).limit(limit);
            return data || [];
        }
    };

    /* --- Full Data Refresh --- */
    async function refreshAll() {
        if (!checkSupabase()) return null;
        try {
            await appointments.list();
            await prescriptions.list();
            await patients.getAll();
            await inventory.list();
            return { success: true };
        } catch (err) {
            console.warn('Full data refresh failed:', err);
        }
        return null;
    }

    /* --- Public API --- */
    return {
        auth, patients, appointments, prescriptions,
        pharmacy, inventory, dashboard, audit,
        refreshAll, processOfflineQueue, initSupabase,
        getCache, setCache
    };
})();
