/* ===== CLINIC ERP — PRINT MODULE ===== */

const PrintModule = (() => {

    /* --- Render Prescription for Print View --- */
    function renderPrescription(data) {
        if (!data) return;

        // Clinic info from settings
        const settings = Utils.retrieve('clinic_erp_settings') || {};
        const clinicName = settings.clinicName || 'Clinic ERP';
        const clinicAddress = settings.clinicAddress || 'Clinic Address';
        const clinicPhone = settings.clinicPhone || '';

        // Header
        const el = (id) => document.getElementById(id);
        if (el('print-clinic-name')) el('print-clinic-name').textContent = clinicName;
        if (el('print-clinic-address')) el('print-clinic-address').textContent = clinicAddress;
        if (el('print-clinic-phone')) el('print-clinic-phone').textContent = clinicPhone ? `Phone: ${clinicPhone}` : '';

        // Date & ID
        const date = data.Timestamp || data.createdAt || data.completedAt || new Date().toISOString();
        if (el('print-date')) el('print-date').textContent = Utils.formatDate(date);
        if (el('print-rx-id')) {
            const rxId = data.prescriptionId || data.PrescriptionID || '';
            const aptId = data.appointmentId || data.AppointmentID || data['Appointment ID'] || '';
            el('print-rx-id').textContent = rxId ? `Rx: ${rxId} | Appt: ${aptId}` : `Appt: ${aptId}`;
        }

        // Patient info
        const name = data.name || data.Name || '-';
        const age = data.age || data.Age || '-';
        const gender = data.gender || data.Gender || '-';
        const phone = data.phone || data.Phone || '-';
        const weight = data.weight || data.Weight || '-';

        if (el('print-p-name')) el('print-p-name').textContent = name;
        if (el('print-p-age-gender')) el('print-p-age-gender').textContent = `${age} / ${gender}`;
        if (el('print-p-phone')) el('print-p-phone').textContent = phone;
        if (el('print-p-weight')) el('print-p-weight').textContent = weight ? `${weight} kg` : '-';

        // Symptoms
        const symptoms = data.symptoms || data.Symptoms || 'None';
        if (el('print-p-symptoms')) el('print-p-symptoms').textContent = symptoms;

        // Diagnosis
        const diagnosis = data.diagnosis || data.Diagnosis || '-';
        if (el('print-p-diagnosis')) el('print-p-diagnosis').textContent = diagnosis;

        // Show/hide sections based on content
        const diagSection = el('print-diagnosis-section');
        if (diagSection) {
            diagSection.style.display = diagnosis && diagnosis !== '-' ? '' : 'none';
        }

        // Medicines table
        let medicines = data.medicines || [];
        if (typeof medicines === 'string') {
            try { medicines = JSON.parse(medicines); } catch (e) { medicines = []; }
        }

        const medTbody = el('print-medicines-tbody');
        const medSection = el('print-medicines-section');

        if (medTbody) {
            if (medicines.length > 0) {
                medTbody.innerHTML = medicines.map((m, i) => `
                    <tr>
                        <td style="text-align: center;">${i + 1}</td>
                        <td><strong>${Utils.escapeHtml(m.name || '')}</strong></td>
                        <td>${Utils.escapeHtml(m.dosage || '')}</td>
                        <td>${Utils.escapeHtml(m.frequency || '')}</td>
                        <td>${Utils.escapeHtml(m.duration || '')}</td>
                        <td>${Utils.escapeHtml(m.instructions || '')}</td>
                    </tr>
                `).join('');
                if (medSection) medSection.style.display = '';
            } else {
                medTbody.innerHTML = '';
                if (medSection) medSection.style.display = 'none';
            }
        }

        // Notes & Advice
        const notes = data.notes || data.Notes || '';
        const advice = data.advice || data.Advice || '';

        if (el('print-p-notes')) el('print-p-notes').textContent = notes || '-';
        if (el('print-p-advice')) {
            el('print-p-advice').textContent = advice ? `Follow-up: ${advice}` : '';
            el('print-p-advice').style.display = advice ? '' : 'none';
        }

        const notesSection = el('print-notes-section');
        if (notesSection) {
            notesSection.style.display = (notes || advice) ? '' : 'none';
        }

        // Doctor signature
        const doctorName = data.doctorName || data.DoctorName || '';
        if (el('print-doctor-name')) {
            el('print-doctor-name').textContent = doctorName || "Doctor's Signature";
        }
    }

    /* --- Print the Prescription --- */
    function print() {
        const name = document.getElementById('print-p-name')?.textContent || 'Patient';
        const rxId = document.getElementById('print-rx-id')?.textContent || '';

        // Set document title for PDF filename
        const originalTitle = document.title;
        const dateStr = Utils.formatDate(new Date()).replace(/\//g, '-');
        document.title = `Prescription_${name}_${dateStr}`;

        window.print();

        // Restore title after print
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    }

    /* --- Send via WhatsApp --- */
    function sendWhatsApp() {
        const phone = document.getElementById('print-p-phone')?.textContent;
        const name = document.getElementById('print-p-name')?.textContent || 'Patient';
        const date = document.getElementById('print-date')?.textContent || '';
        const diagnosis = document.getElementById('print-p-diagnosis')?.textContent || '';

        if (!phone || phone === '-') {
            Utils.showToast('No phone number available.', 'error');
            return;
        }

        let phoneNum = phone.toString().replace(/\D/g, '');
        if (phoneNum.length === 10) phoneNum = '91' + phoneNum;

        // Build medicines list
        let medsText = '';
        const medRows = document.querySelectorAll('#print-medicines-tbody tr');
        medRows.forEach((row, i) => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const medName = cells[1]?.textContent.trim();
                const dosage = cells[2]?.textContent.trim();
                const freq = cells[3]?.textContent.trim();
                const dur = cells[4]?.textContent.trim();
                medsText += `\n${i + 1}. ${medName} ${dosage} — ${freq} × ${dur}`;
            }
        });

        const settings = Utils.retrieve('clinic_erp_settings') || {};
        const clinicName = settings.clinicName || 'Clinic ERP';

        const message = `Hello *${name}*,\n\nYour prescription from *${clinicName}*:\n📅 Date: ${date}\n🏥 Diagnosis: ${diagnosis}\n\n💊 *Medicines:*${medsText || '\nNone prescribed'}\n\nThank you for visiting! We wish you a speedy recovery. 🙏`;

        const url = `https://wa.me/${phoneNum}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    /* --- Print from Record (for tables) --- */
    function printFromRecord(aptId) {
        const records = API.getCache('allRecords') || [];
        const record = records.find(r =>
            (r.appointmentId || r.AppointmentID || r['Appointment ID']) === aptId
        );

        if (!record) {
            Utils.showToast('Record not found.', 'error');
            return;
        }

        const prescriptions = API.getCache('prescriptions') || [];
        const rx = prescriptions.find(p =>
            (p.appointmentId || p.AppointmentID || p['Appointment ID']) === aptId
        );

        if (rx) {
            let meds = rx.medicines || rx.Medicines || '[]';
            if (typeof meds === 'string') {
                try { meds = JSON.parse(meds); } catch (e) { meds = []; }
            }
            renderPrescription({ ...record, ...rx, medicines: meds });
        } else {
            renderPrescription(record);
        }

        App.navigateTo('print-view');
    }

    return {
        renderPrescription,
        print,
        sendWhatsApp,
        printFromRecord
    };
})();
