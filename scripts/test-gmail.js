const { google } = require('googleapis');

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
  console.error('Missing env vars. Run as:');
  console.error('  $env:GMAIL_CLIENT_ID="..."; $env:GMAIL_CLIENT_SECRET="..."; $env:GMAIL_REFRESH_TOKEN="..."; node scripts/test-gmail.js');
  process.exit(1);
}

console.log('Client ID   :', GMAIL_CLIENT_ID.slice(0, 20) + '...');
console.log('Client Secret:', GMAIL_CLIENT_SECRET.slice(0, 8) + '...');
console.log('Refresh Token:', GMAIL_REFRESH_TOKEN.slice(0, 8) + '...');

const auth = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
auth.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

auth.getAccessToken()
  .then(({ token }) => {
    console.log('\n✓ SUCCESS — access token starts with:', token.slice(0, 20) + '...');
    console.log('Credentials are valid. Update Vercel with these exact values.');
  })
  .catch(err => {
    console.error('\n✗ FAILED:', err.message);
    console.error('The credentials above are invalid. Check Google Cloud Console.');
  });
