

const data = {
    appointmentId: 'APT-TEST',
    patientId: 'PID-TEST',
    appointmentTime: ''
};

// Paste mapPayload here exactly as it is in api.js
function mapPayload(data) {
    const out = {};
    for (let k in data) {
        let pKey = k;
        if (k === 'appointmentId') pKey = 'AppointmentID';
        else if (k === 'patientId') pKey = 'PatientID';
        else if (k === 'appointmentTime') pKey = 'AppointmentTime';
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

const mappedAppt = mapPayload({ ...data, Timestamp: new Date().toISOString() });
console.log('mappedAppt:', mappedAppt);

// Then simulate what supabase insert does
const url = 'https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Appointments';
const headers = {
  'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

global.fetch(url, { method: 'POST', headers, body: JSON.stringify(mappedAppt) })
  .then(r => r.text())
  .then(text => console.log('Response:', text))
  .catch(e => console.error('Error:', e));
