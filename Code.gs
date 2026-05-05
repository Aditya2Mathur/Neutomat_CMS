/**
 * ===== CLINIC ERP — GOOGLE APPS SCRIPT BACKEND =====
 * 
 * Deploy this as a Web App from script.google.com
 * 
 * SETUP:
 * 1. Create a Google Sheet with the following tabs:
 *    - Appointments, Patients, Prescriptions, Inventory, DispenseLog, Users, AuditLog
 * 2. Copy this code into the Apps Script editor
 * 3. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the deployment URL into the Settings panel in the app
 */

// ===== CONFIGURATION =====
const SPREADSHEET_ID = '1t5hKo4xXy4RHS--9vprxVcuKGm0GakYBJBlyWo5zQJ0';
const SHEETS = {
  APPOINTMENTS: 'Appointments',
  PATIENTS: 'Patients',
  PRESCRIPTIONS: 'Prescriptions',
  INVENTORY: 'Inventory',
  DISPENSE_LOG: 'DispenseLog',
  USERS: 'Users',
  AUDIT_LOG: 'AuditLog'
};

// ===== HELPERS =====

function migrateAndInitializeMissingSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  Object.values(SHEETS).forEach(sheetName => {
    if (!ss.getSheetByName(sheetName)) {
      ss.insertSheet(sheetName);
    }
  });
}

function syncSpreadsheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const headersMap = {
    [SHEETS.APPOINTMENTS]: ['AppointmentID', 'PatientID', 'DoctorID', 'DoctorName', 'Specialty', 'Name', 'Age', 'Gender', 'Phone', 'Address', 'Weight', 'Symptoms', 'Fee', 'Status', 'BookedBy', 'AppointmentDate', 'AppointmentTime', 'VisitCount', 'ValidTill', 'CreatedAt', 'Timestamp'],
    [SHEETS.PATIENTS]: ['PatientID', 'Name', 'Age', 'Gender', 'Phone', 'Address', 'Weight', 'BloodGroup', 'CreatedAt', 'LastVisit'],
    [SHEETS.PRESCRIPTIONS]: ['PrescriptionID', 'AppointmentID', 'PatientID', 'DoctorID', 'DoctorName', 'Diagnosis', 'Notes', 'Advice', 'Medicines', 'Status', 'CreatedAt', 'CompletedAt'],
    [SHEETS.INVENTORY]: ['MedicineID', 'Name', 'Category', 'Stock', 'Unit', 'MinStock', 'Price', 'LastUpdated'],
    [SHEETS.DISPENSE_LOG]: ['DispenseID', 'PrescriptionID', 'PatientID', 'Medicines', 'TotalAmount', 'Status', 'Timestamp'],
    [SHEETS.USERS]: ['Username', 'PasswordHash', 'Role', 'FullName', 'Specialty', 'Email', 'IsActive', 'CreatedAt'],
    [SHEETS.AUDIT_LOG]: ['LogID', 'Timestamp', 'User', 'Action', 'Entity', 'EntityID', 'Details']
  };

  Object.keys(headersMap).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const headers = headersMap[sheetName];
    // Force set the first row
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Clear the rest of the sheet (rows 2 to 100) to wipe corrupt demo data safely!
    const maxRows = sheet.getMaxRows();
    if (maxRows > 1) {
      try {
        sheet.getRange(2, 1, maxRows - 1, sheet.getMaxColumns()).clearContent();
      } catch(e) {}
    }
  });
}

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function getSheetData(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(sheetName, data, headers) {
  const sheet = getSheet(sheetName);
  if (!sheet) return;
  const row = headers.map(h => data[h] || '');
  sheet.appendRow(row);
}

function updateRow(sheetName, matchCol, matchVal, updateData) {
  const sheet = getSheet(sheetName);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(matchCol);
  if (colIdx < 0) return false;

  for (let i = 1; i < data.length; i++) {
    if (data[i][colIdx].toString() === matchVal.toString()) {
      Object.entries(updateData).forEach(([key, val]) => {
        const ki = headers.indexOf(key);
        if (ki >= 0) sheet.getRange(i + 1, ki + 1).setValue(val);
      });
      return true;
    }
  }
  return false;
}

function generateId(prefix) {
  return prefix + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== WEB APP ENDPOINTS =====

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'getAllData';

  try {
    switch (action) {
      case 'getAppointments':
        return jsonResponse(getSheetData(SHEETS.APPOINTMENTS));

      case 'getPatients':
        return jsonResponse(getSheetData(SHEETS.PATIENTS));

      case 'getPrescriptions':
        return jsonResponse(getSheetData(SHEETS.PRESCRIPTIONS));

      case 'getInventory':
        return jsonResponse(getSheetData(SHEETS.INVENTORY));

      case 'getUsers':
        return jsonResponse(getSheetData(SHEETS.USERS));

      case 'getAuditLog':
        const limit = parseInt(e.parameter.limit) || 50;
        const logs = getSheetData(SHEETS.AUDIT_LOG);
        return jsonResponse(logs.slice(-limit));

      case 'findPatient': {
        const phone = e.parameter.phone;
        const patients = getSheetData(SHEETS.PATIENTS);
        const found = patients.filter(p => p.Phone && p.Phone.toString() === phone);
        return jsonResponse(found.length > 0 ? found[0] : null);
      }

      case 'authenticate': {
        const username = e.parameter.username;
        const passwordHash = e.parameter.passwordHash;
        const users = getSheetData(SHEETS.USERS);
        const user = users.find(u =>
          u.Username === username && u.PasswordHash === passwordHash && u.IsActive !== false
        );
        if (user) {
          return jsonResponse({
            success: true,
            username: user.Username,
            name: user.FullName,
            role: user.Role,
            specialty: user.Specialty || null
          });
        }
        return jsonResponse({ success: false, error: 'Invalid credentials' });
      }

      case 'getDashboardStats': {
        const appointments = getSheetData(SHEETS.APPOINTMENTS);
        const today = new Date().toLocaleDateString('en-GB');
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        let daily = 0, weekly = 0, monthly = 0, totalFee = 0;
        appointments.forEach(a => {
          const ts = a.CreatedAt || a.Timestamp;
          if (!ts) return;
          const d = new Date(ts);
          if (d.toLocaleDateString('en-GB') === today) {
            daily++;
            totalFee += parseFloat(a.Fee) || 0;
          }
          if (d >= weekAgo) weekly++;
          if (d >= monthAgo) monthly++;
        });

        return jsonResponse({ daily, weekly, monthly, totalFee, total: appointments.length });
      }

      case 'getAllData':
      default:
        return jsonResponse({
          appointments: getSheetData(SHEETS.APPOINTMENTS),
          prescriptions: getSheetData(SHEETS.PRESCRIPTIONS),
          patients: getSheetData(SHEETS.PATIENTS),
          inventory: getSheetData(SHEETS.INVENTORY)
        });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || 'createAppointment';

    switch (action) {
      case 'createAppointment': {
        const headers = [
          'AppointmentID', 'PatientID', 'DoctorID', 'DoctorName', 'Specialty',
          'Name', 'Age', 'Gender', 'Phone', 'Address', 'Weight',
          'Symptoms', 'Fee', 'Status', 'BookedBy',
          'AppointmentDate', 'AppointmentTime', 'VisitCount', 'ValidTill',
          'CreatedAt', 'Timestamp'
        ];
        const data = {
          AppointmentID: payload.appointmentId || generateId('APT'),
          PatientID: payload.patientId || '',
          DoctorID: payload.doctorId || '',
          DoctorName: payload.doctorName || '',
          Specialty: payload.specialty || '',
          Name: payload.name || '',
          Age: payload.age || '',
          Gender: payload.gender || '',
          Phone: payload.phone || '',
          Address: payload.address || '',
          Weight: payload.weight || '',
          Symptoms: payload.symptoms || '',
          Fee: payload.fee || '',
          Status: payload.status || 'booked',
          BookedBy: payload.bookedBy || '',
          AppointmentDate: payload.appointmentDate || '',
          AppointmentTime: payload.appointmentTime || '',
          VisitCount: payload.visitCount || 1,
          ValidTill: payload.validTill || '',
          CreatedAt: new Date().toISOString(),
          Timestamp: new Date().toISOString()
        };

        appendRow(SHEETS.APPOINTMENTS, data, headers);

        // Also create/update patient record
        createOrUpdatePatient(payload);

        return jsonResponse({ success: true, appointmentId: data.AppointmentID });
      }

      case 'createPatient': {
        createOrUpdatePatient(payload);
        return jsonResponse({ success: true });
      }

      case 'updateAppointment': {
        const aptId = payload.appointmentId;
        const updateData = {};
        if (payload.status) updateData.Status = payload.status;
        if (payload.doctorId) updateData.DoctorID = payload.doctorId;
        updateRow(SHEETS.APPOINTMENTS, 'AppointmentID', aptId, updateData);
        return jsonResponse({ success: true });
      }

      case 'savePrescription': {
        const rxHeaders = [
          'PrescriptionID', 'AppointmentID', 'PatientID', 'DoctorID', 'DoctorName',
          'Diagnosis', 'Notes', 'Advice', 'Medicines',
          'Status', 'CreatedAt', 'CompletedAt'
        ];
        const rxData = {
          PrescriptionID: payload.prescriptionId || generateId('RX'),
          AppointmentID: payload.appointmentId || '',
          PatientID: payload.patientId || '',
          DoctorID: payload.doctorId || '',
          DoctorName: payload.doctorName || '',
          Diagnosis: payload.diagnosis || '',
          Notes: payload.notes || '',
          Advice: payload.advice || '',
          Medicines: typeof payload.medicines === 'string' ? payload.medicines : JSON.stringify(payload.medicines || []),
          Status: payload.status || 'draft',
          CreatedAt: new Date().toISOString(),
          CompletedAt: payload.completedAt || ''
        };

        appendRow(SHEETS.PRESCRIPTIONS, rxData, rxHeaders);

        // Update appointment status
        if (payload.appointmentId && payload.status === 'sent_to_pharmacy') {
          updateRow(SHEETS.APPOINTMENTS, 'AppointmentID', payload.appointmentId, {
            Status: 'prescription_completed'
          });
        }

        return jsonResponse({ success: true, prescriptionId: rxData.PrescriptionID });
      }

      case 'updatePrescriptionStatus': {
        const rxId = payload.prescriptionId;
        updateRow(SHEETS.PRESCRIPTIONS, 'PrescriptionID', rxId, {
          Status: payload.status
        });
        return jsonResponse({ success: true });
      }

      case 'dispensePrescription': {
        const dRxId = payload.prescriptionId;
        updateRow(SHEETS.PRESCRIPTIONS, 'PrescriptionID', dRxId, {
          Status: 'dispensed'
        });

        // Log dispense
        const dspHeaders = ['LogID', 'PrescriptionID', 'DispensedBy', 'Items', 'TotalAmount', 'Status', 'DispensedAt'];
        const dspData = {
          LogID: generateId('DSP'),
          PrescriptionID: dRxId,
          DispensedBy: payload.dispensedBy || '',
          Items: JSON.stringify(payload.items || []),
          TotalAmount: payload.totalAmount || 0,
          Status: 'dispensed',
          DispensedAt: new Date().toISOString()
        };
        appendRow(SHEETS.DISPENSE_LOG, dspData, dspHeaders);

        return jsonResponse({ success: true });
      }

      case 'updateInventory': {
        updateRow(SHEETS.INVENTORY, 'MedicineID', payload.medicineId, {
          Stock: payload.stock,
          LastUpdated: new Date().toISOString()
        });
        return jsonResponse({ success: true });
      }

      case 'addMedicine': {
        const medHeaders = ['MedicineID', 'Name', 'Category', 'Stock', 'Unit', 'MinStock', 'Price', 'LastUpdated'];
        const medData = {
          MedicineID: payload.medicineId || generateId('MED'),
          Name: payload.name || '',
          Category: payload.category || 'Tablet',
          Stock: payload.stock || 0,
          Unit: payload.unit || 'strips',
          MinStock: payload.minStock || 10,
          Price: payload.price || 0,
          LastUpdated: new Date().toISOString()
        };
        appendRow(SHEETS.INVENTORY, medData, medHeaders);
        return jsonResponse({ success: true });
      }

      case 'logAudit': {
        const auditHeaders = ['LogID', 'UserID', 'Action', 'EntityType', 'EntityID', 'Details', 'Timestamp'];
        const auditData = {
          LogID: new Date().getTime().toString(),
          UserID: payload.userId || '',
          Action: payload.action || '',
          EntityType: payload.entityType || '',
          EntityID: payload.entityId || '',
          Details: payload.details || '',
          Timestamp: new Date().toISOString()
        };
        appendRow(SHEETS.AUDIT_LOG, auditData, auditHeaders);
        return jsonResponse({ success: true });
      }

      default:
        // Legacy: treat as appointment creation (backward compatible)
        const legacyHeaders = [
          'AppointmentID', 'PatientID', 'Name', 'Age', 'Gender',
          'Phone', 'Address', 'Weight', 'Symptoms', 'Fee',
          'VisitCount', 'ValidTill', 'Status', 'CreatedAt', 'Timestamp'
        ];
        const legacyData = {
          AppointmentID: payload.appointmentId || generateId('APT'),
          PatientID: payload.patientId || '',
          Name: payload.name || '',
          Age: payload.age || '',
          Gender: payload.gender || '',
          Phone: payload.phone || '',
          Address: payload.address || '',
          Weight: payload.weight || '',
          Symptoms: payload.symptoms || '',
          Fee: payload.fee || '',
          VisitCount: payload.visitCount || 1,
          ValidTill: payload.validTill || '',
          Status: 'booked',
          CreatedAt: new Date().toISOString(),
          Timestamp: new Date().toISOString()
        };
        appendRow(SHEETS.APPOINTMENTS, legacyData, legacyHeaders);
        return jsonResponse({ success: true });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ===== HELPER FUNCTIONS =====

function createOrUpdatePatient(payload) {
  const phone = payload.phone || payload.Phone || '';
  if (!phone) return;

  const patients = getSheetData(SHEETS.PATIENTS);
  const existing = patients.find(p => p.Phone && p.Phone.toString() === phone.toString());

  if (!existing) {
    const patientHeaders = [
      'PatientID', 'Name', 'Age', 'Gender', 'Phone', 'Address',
      'Weight', 'BloodGroup', 'CreatedAt', 'LastVisit'
    ];
    appendRow(SHEETS.PATIENTS, {
      PatientID: payload.patientId || generateId('PID'),
      Name: payload.name || '',
      Age: payload.age || '',
      Gender: payload.gender || '',
      Phone: phone,
      Address: payload.address || '',
      Weight: payload.weight || '',
      BloodGroup: '',
      CreatedAt: new Date().toISOString(),
      LastVisit: new Date().toISOString()
    }, patientHeaders);
  } else {
    // Update last visit
    updateRow(SHEETS.PATIENTS, 'Phone', phone, {
      LastVisit: new Date().toISOString(),
      Name: payload.name || existing.Name,
      Age: payload.age || existing.Age,
      Weight: payload.weight || existing.Weight,
      Address: payload.address || existing.Address
    });
  }
}

// ===== DOCTOR ASSIGNMENT =====

function assignDoctorBySpecialty(specialty) {
  const users = getSheetData(SHEETS.USERS);
  const doctors = users.filter(u => u.Role === 'doctor' && u.IsActive !== false);

  // Exact match first
  const exact = doctors.find(d => d.Specialty === specialty);
  if (exact) return { username: exact.Username, name: exact.FullName };

  // General fallback
  const general = doctors.find(d => d.Specialty === 'general');
  if (general) return { username: general.Username, name: general.FullName };

  return doctors.length > 0 ? { username: doctors[0].Username, name: doctors[0].FullName } : null;
}

// ===== SHEET SETUP (Run once) =====

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheetsConfig = {
    'Appointments': ['AppointmentID', 'PatientID', 'DoctorID', 'DoctorName', 'Specialty', 'Name', 'Age', 'Gender', 'Phone', 'Address', 'Weight', 'Symptoms', 'Fee', 'Status', 'BookedBy', 'AppointmentDate', 'AppointmentTime', 'VisitCount', 'ValidTill', 'CreatedAt', 'Timestamp'],
    'Patients': ['PatientID', 'Name', 'Age', 'Gender', 'Phone', 'Address', 'Weight', 'BloodGroup', 'CreatedAt', 'LastVisit'],
    'Prescriptions': ['PrescriptionID', 'AppointmentID', 'PatientID', 'DoctorID', 'DoctorName', 'Diagnosis', 'Notes', 'Advice', 'Medicines', 'Status', 'CreatedAt', 'CompletedAt'],
    'Inventory': ['MedicineID', 'Name', 'Category', 'Stock', 'Unit', 'MinStock', 'Price', 'LastUpdated'],
    'DispenseLog': ['LogID', 'PrescriptionID', 'DispensedBy', 'Items', 'TotalAmount', 'Status', 'DispensedAt'],
    'Users': ['UserID', 'Username', 'PasswordHash', 'FullName', 'Role', 'Specialty', 'IsActive', 'CreatedAt'],
    'AuditLog': ['LogID', 'UserID', 'Action', 'EntityType', 'EntityID', 'Details', 'Timestamp']
  };

  Object.entries(sheetsConfig).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    // Set headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f1f5f9');
    sheet.setFrozenRows(1);
  });

  Logger.log('All sheets created successfully!');
}
