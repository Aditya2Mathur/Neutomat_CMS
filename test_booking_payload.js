

const bookingData = {
            appointmentId: 'APT-TEST2' + Date.now(),
            patientId: 'PID-TEST2' + Date.now(),
            phone: '9998887776',
            name: 'Jane Doe',
            age: '25',
            gender: 'Female',
            address: 'Test',
            weight: '',
            specialty: 'Gynecology',
            symptoms: '',
            appointmentDate: '2026-05-05',
            appointmentTime: '',
            fee: '300',
            status: 'booked',
            bookedBy: 'admin',
            visitCount: 1,
            validTill: '2026-05-10',
            doctorId: 'gynecologist',
            doctorName: 'Dr. Shruti Mathur'
        };

function mapPayload(data) {
    const out = {};
    for (let k in data) {
        let pKey = k;
        if (k === 'appointmentId') pKey = 'AppointmentID';
        else if (k === 'patientId') pKey = 'PatientID';
        else if (k === 'doctorId') pKey = 'DoctorID';
        else if (k === 'doctorName') pKey = 'DoctorName';
        else if (k === 'specialty') pKey = 'Specialty';
        else if (k === 'bookedBy') pKey = 'BookedBy';
        else if (k === 'visitCount') pKey = 'VisitCount';
        else if (k === 'appointmentDate') pKey = 'AppointmentDate';
        else if (k === 'appointmentTime') pKey = 'AppointmentTime';
        else if (k === 'validTill') pKey = 'ValidTill';
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

const mappedAppt = mapPayload({ ...bookingData, Timestamp: new Date().toISOString() });
mappedAppt.Age = mappedAppt.Age ? Number(mappedAppt.Age) : null;
mappedAppt.Fee = mappedAppt.Fee ? Number(mappedAppt.Fee) : 0;
mappedAppt.VisitCount = mappedAppt.VisitCount ? Number(mappedAppt.VisitCount) : 1;

console.log('mappedAppt:', mappedAppt);

const url = 'https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Appointments';
const headers = {
  'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

global.fetch(url, { method: 'POST', headers, body: JSON.stringify(mappedAppt) })
  .then(r => {
      console.log('Status:', r.status);
      return r.text();
  })
  .then(text => console.log('Response:', text))
  .catch(e => console.error('Error:', e));
