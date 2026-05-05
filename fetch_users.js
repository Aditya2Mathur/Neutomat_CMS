const headers = {
  'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
  'Content-Type': 'application/json'
};

global.fetch('https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Users?select=*', { headers })
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e));
