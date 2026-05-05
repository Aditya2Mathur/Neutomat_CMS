

const mappedPatient = {
    PatientID: 'PID-TEST21777961114258',
    Name: 'Jane Doe',
    Age: 25,
    Gender: 'Female',
    Phone: '9998887776',
    Address: 'Test',
    Weight: null,
    CreatedAt: new Date().toISOString(),
    LastVisit: new Date().toISOString()
};

const url = 'https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Patients';
const headers = {
  'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

global.fetch(url, { method: 'POST', headers, body: JSON.stringify(mappedPatient) })
  .then(r => {
      console.log('Status:', r.status);
      return r.text();
  })
  .then(text => console.log('Response:', text))
  .catch(e => console.error('Error:', e));
