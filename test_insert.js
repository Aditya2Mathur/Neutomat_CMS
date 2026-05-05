const url = 'https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Appointments';
const headers = {
  'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};
const body = JSON.stringify({
  AppointmentID: 'APT-TEST' + Date.now(),
  PatientID: 'PID-TEST',
  Name: 'Test From Node',
  Status: 'booked'
});

global.fetch(url, { method: 'POST', headers, body })
  .then(r => r.text())
  .then(text => console.log('Response:', text))
  .catch(e => console.error('Error:', e));
