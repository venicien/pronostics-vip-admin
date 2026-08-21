global.window = {};
global.document = {};
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.alert = () => {};
global.confirm = () => true;

import('./js/app.js').then(() => {
  console.log('Admin JS compiled successfully');
}).catch(e => {
  console.error('Error in Admin JS:', e);
  process.exit(1);
});
