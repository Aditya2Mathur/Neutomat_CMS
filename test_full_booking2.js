const bookingData = {
    appointmentId: 'APT-TEST3' + Date.now(),
    patientId: 'PID-TEST3' + Date.now(),
    phone: '9998887776',
    name: 'Jane Doe',
    age: '25',
    gender: 'Female',
    address: 'Test',
    weight: '',
    specialty: 'gynecologist',
    symptoms: '',
    appointmentDate: '2026-05-05',
    appointmentTime: '',
    fee: '300',
    status: 'booked',
    bookedBy: 'admin',
    visitCount: 1,
    validTill: '2026-05-10',
    doctorId: 'gynec', // CORRECTED TO REAL USERNAME
    doctorName: 'Dr. Afifa'
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

const mappedPatient = {
    PatientID: mappedAppt.PatientID,
    Name: bookingData.name,
    Age: mappedAppt.Age,
    Gender: bookingData.gender,
    Phone: bookingData.phone,
    Address: bookingData.address,
    Weight: bookingData.weight === '' ? null : bookingData.weight,
    CreatedAt: new Date().toISOString(),
    LastVisit: new Date().toISOString()
};

const headers = {
  'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function test() {
    console.log('Upserting patient...');
    const pRes = await global.fetch('https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Patients', {
        method: 'POST', headers, body: JSON.stringify(mappedPatient)
    });
    console.log('Patient Upsert:', pRes.status, await pRes.text());

    console.log('Inserting appointment...');
    const aRes = await global.fetch('https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Appointments', {
        method: 'POST', headers, body: JSON.stringify(mappedAppt)
    });
    console.log('Appointment Insert:', aRes.status, await aRes.text());
}

test();
