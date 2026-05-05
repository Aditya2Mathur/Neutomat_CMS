const url = 'https://fukuikzuyiobtrnwlhji.supabase.co/rest/v1/Appointments?limit=1';
global.fetch(url, {
  headers: {
    'apikey': 'sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B',
    'Authorization': 'Bearer sb_publishable_Le0fbOORQkPf1GihzabiwA_8uXSvW9B'
  }
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(e => console.error(e));
