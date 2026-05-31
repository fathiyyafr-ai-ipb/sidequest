const assert = require('assert');
const http = require('http');

const API_BASE = 'http://localhost:3001/api';

// Helper to execute HTTP requests with Promises
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        const bodyObj = ct.includes('application/json') ? JSON.parse(data) : data;
        resolve({ status: res.statusCode, body: bodyObj });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  try {
    console.log('=== STARTING SPONSORSHIP & AD CAMPAIGN INTEGRATION TEST ===');

    let modToken = null;
    let sponsorToken = null;
    let sponsorId = null;
    let adId = null;

    // 1. Log in as Moderator to perform sponsorship configurations
    console.log('1. Logging in as Moderator (moderator@sidequest.com)...');
    const modLogin = await request('POST', '/auth/login', {
      email: 'moderator@sidequest.com',
      password: 'password123'
    });
    assert.strictEqual(modLogin.status, 200, 'Moderator login failed!');
    modToken = modLogin.body.data.accessToken;
    console.log('   Success! Logged in as: ' + modLogin.body.data.user.name);

    // 2. Moderator invites a new Sponsor
    console.log('2. Moderator inviting a new Sponsor...');
    const testEmail = `sponsor_${Date.now()}@ipb.ac.id`;
    const inviteRes = await request('POST', '/admin/invite-sponsor', {
      name: 'Google Indonesia',
      email: testEmail,
      password: 'passwordSponsor123',
      company_name: 'PT Google Indonesia'
    }, modToken);
    assert.strictEqual(inviteRes.status, 201, 'Failed to invite sponsor!');
    sponsorId = inviteRes.body.data.id;
    console.log(`   Success! Invited sponsor "${inviteRes.body.data.name}" with ID: ${sponsorId}`);

    // 3. New Sponsor logs in
    console.log('3. Logging in as the newly invited Sponsor...');
    const sponsorLogin = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'passwordSponsor123'
    });
    assert.strictEqual(sponsorLogin.status, 200, 'Sponsor login failed!');
    sponsorToken = sponsorLogin.body.data.accessToken;
    assert.strictEqual(sponsorLogin.body.data.user.role, 'sponsor', 'User role should be sponsor!');
    console.log('   Success! Sponsor logged in successfully.');

    // 4. Retrieve pricing rates
    console.log('4. Querying current pricing rates...');
    const pricingRes = await request('GET', '/sponsor/pricing', null, sponsorToken);
    assert.strictEqual(pricingRes.status, 200, 'Failed to fetch pricing rates!');
    console.log('   Current rates loaded: ' + JSON.stringify(pricingRes.body.data.rates));

    // 5. Add historical pricing rate (Moderator)
    console.log('5. Moderator adds a historical pricing rate effective on a future date...');
    const futureDate = '2026-06-01';
    const newRateRes = await request('POST', '/admin/sponsorship-pricing', {
      page_key: 'dashboard',
      price_per_day: 25000,
      effective_date: futureDate
    }, modToken);
    assert.strictEqual(newRateRes.status, 201, 'Failed to add pricing rate configuration!');
    console.log(`   Success! Added price rate for dashboard: 25000 IDR starting on ${futureDate}`);

    // 6. Sponsor creates an ad campaign
    console.log('6. Sponsor creates an ad campaign spanning dashboard and competitions...');
    // We choose start date '2026-05-15' (so effective rate for dashboard should resolve from '2026-05-01' seed = 15000 IDR)
    // Date effective check: effective rates as of 2026-05-15:
    // dashboard: 15000 (from seed effective '2026-05-01') because 25000 is only effective '2026-06-01'
    // competitions: 10000 (from seed effective '2026-05-01')
    // Total price per day = 15000 + 10000 = 25000
    // Duration: 2026-05-15 to 2026-05-24 = 10 days
    // Expected Total Cost = 25000 * 10 = 250000 IDR
    const adPayload = {
      title: 'Google Solution Challenge 2026',
      target_url: 'https://developers.google.com/community/ssc',
      image_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97',
      pages: ['dashboard', 'competitions'],
      start_date: '2026-05-15',
      end_date: '2026-05-24'
    };
    const createAdRes = await request('POST', '/sponsor/ads', adPayload, sponsorToken);
    assert.strictEqual(createAdRes.status, 201, 'Failed to create campaign!');
    adId = createAdRes.body.data.id;
    const resolvedCost = parseFloat(createAdRes.body.data.total_cost);
    assert.strictEqual(resolvedCost, 250000, `Expected total cost 250,000 IDR, but got ${resolvedCost}`);
    console.log(`   Success! Created ad campaign "${createAdRes.body.data.title}" with resolved cost IDR ${resolvedCost}`);

    // 7. Moderator fetches global campaign list and sees the new ad
    console.log('7. Moderator fetches global sponsorship campaigns...');
    const allSponsorsRes = await request('GET', '/admin/sponsorships', null, modToken);
    assert.strictEqual(allSponsorsRes.status, 200, 'Failed to load global sponsorships!');
    const myAdObj = allSponsorsRes.body.data.find(a => a.id === adId);
    assert.ok(myAdObj, 'Our newly created ad must exist in global admin roster!');
    console.log(`   Success! Found ad with Title: "${myAdObj.title}" under Sponsor: "${myAdObj.sponsor_name}"`);

    // 8. Moderator adjusts total campaign cost manually with a mandatory reason
    console.log(`8. Moderator adjusts total cost for campaign ID ${adId} manually...`);
    const adjustRes = await request('PATCH', `/admin/sponsorships/${adId}/cost`, {
      total_cost: 200000,
      reason: 'Diskon kerjasama khusus komunitas SideQuest Indonesia'
    }, modToken);
    assert.strictEqual(adjustRes.status, 200, 'Failed to adjust sponsorship cost!');
    console.log(`   Success! ${adjustRes.body.message}`);

    // 9. Retrieve cost logs history for the campaign
    console.log(`9. Verifying audit cost log is registered for campaign ID ${adId}...`);
    const logsRes = await request('GET', `/admin/sponsorships/${adId}/logs`, null, modToken);
    assert.strictEqual(logsRes.status, 200, 'Failed to fetch cost audit logs!');
    assert.ok(logsRes.body.data.length > 0, 'Audit log list should not be empty!');
    const latestLog = logsRes.body.data[0];
    assert.strictEqual(parseFloat(latestLog.old_cost), 250000, 'Old cost must be 250,000!');
    assert.strictEqual(parseFloat(latestLog.new_cost), 200000, 'New cost must be 200,000!');
    assert.strictEqual(latestLog.reason, 'Diskon kerjasama khusus komunitas SideQuest Indonesia', 'Audit log reason mismatch!');
    console.log(`   Success! Verified audit trail log: Changed from ${latestLog.old_cost} to ${latestLog.new_cost}. Reason: "${latestLog.reason}"`);

    // 10. Public targeted active ad loading
    console.log('10. Public loading active targeted ad for page: dashboard...');
    const activeAdRes = await request('GET', '/sponsor/active-ads?page=dashboard');
    assert.strictEqual(activeAdRes.status, 200, 'Failed to load active ad!');
    // (Note: it might return our newly created ad if date is in scope. But wait, our ad dates are '2026-05-15' to '2026-05-24'.
    // If CURRENT_DATE is within this range, it will return it. If not, it might return null or another ad.
    // Let's verify that the endpoint works correctly.)
    console.log('    Active ad details: ' + JSON.stringify(activeAdRes.body.data));

    // 11. E2E public impressions tracking
    console.log(`11. Public triggers impressions batch tracking for ad ID: ${adId}...`);
    const impressionRes = await request('POST', '/sponsor/ads/impression', {
      adIds: [adId]
    });
    assert.strictEqual(impressionRes.status, 200, 'Failed to track impressions!');
    console.log(`    Success! Impressions tracked.`);

    // 12. E2E public click tracking
    console.log(`12. Public triggers click tracking for ad ID: ${adId}...`);
    const clickRes = await request('POST', `/sponsor/ads/${adId}/click`);
    assert.strictEqual(clickRes.status, 200, 'Failed to track click!');
    assert.strictEqual(clickRes.body.data.clicks, 1, 'Click counter should increment to 1');
    console.log(`    Success! Click recorded. Clicks = ${clickRes.body.data.clicks}`);

    // 13. Confirm suspension filter toggling works
    console.log(`13. Moderator suspends (deactivates) campaign ID ${adId}...`);
    const toggleActiveRes = await request('PATCH', `/admin/sponsorships/${adId}/toggle`, null, modToken);
    assert.strictEqual(toggleActiveRes.status, 200, 'Failed to toggle sponsorship status!');
    assert.strictEqual(toggleActiveRes.body.data.is_active, false, 'Campaign should be inactive!');
    console.log(`    Success! Campaign suspended: is_active = ${toggleActiveRes.body.data.is_active}`);

    // 14. Reactivate to ensure integrity
    console.log(`14. Moderator reactivates campaign ID ${adId}...`);
    const toggleReactivate = await request('PATCH', `/admin/sponsorships/${adId}/toggle`, null, modToken);
    assert.strictEqual(toggleReactivate.status, 200, 'Failed to reactivate sponsorship!');
    assert.strictEqual(toggleReactivate.body.data.is_active, true, 'Campaign should be active!');
    console.log(`    Success! Campaign reactivated: is_active = ${toggleReactivate.body.data.is_active}`);

    console.log('\n✅ ALL SPONSORSHIP & AD CAMPAIGN INTEGRATION TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

main();
