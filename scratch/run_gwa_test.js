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
    console.log('=== STARTING GWA METRICS DASHBOARD INTEGRATION TEST ===');

    // 1. Log in as Moderator
    console.log('1. Logging in as Staff Moderator (moderator@sidequest.com)...');
    const modLogin = await request('POST', '/auth/login', {
      email: 'moderator@sidequest.com',
      password: 'password123'
    });
    assert.strictEqual(modLogin.status, 200, 'Moderator login failed!');
    const modToken = modLogin.body.data.accessToken;
    console.log('   Success! Token received.');

    // 2. Fetch stats
    console.log('2. Fetching dashboard stats (GET /api/admin/stats)...');
    const statsRes = await request('GET', '/admin/stats', null, modToken);
    assert.strictEqual(statsRes.status, 200, 'Failed to fetch admin stats!');
    
    const stats = statsRes.body.data;
    assert.ok(stats, 'Stats response body should not be empty');

    // 3. Verify traditional stats are still present (Backwards Compatibility)
    console.log('3. Asserting traditional counter structures remain intact...');
    assert.ok(stats.users, 'Traditional users statistics missing');
    assert.strictEqual(typeof stats.users.total, 'number', 'Traditional users total should be a number');
    assert.strictEqual(typeof stats.users.active, 'number', 'Traditional users active should be a number');

    assert.ok(stats.competitions, 'Traditional competitions statistics missing');
    assert.strictEqual(typeof stats.competitions.total, 'number', 'Traditional competitions total should be a number');
    assert.strictEqual(typeof stats.competitions.active, 'number', 'Traditional competitions active should be a number');

    assert.ok(stats.teams, 'Traditional teams statistics missing');
    assert.strictEqual(typeof stats.teams.total, 'number', 'Traditional teams total should be a number');
    assert.strictEqual(typeof stats.teams.active, 'number', 'Traditional teams active should be a number');

    console.log(`   Traditional counters verified. Users: ${stats.users.total}, Competitions: ${stats.competitions.total}, Teams: ${stats.teams.total}`);

    // 4. Verify GWA structure is present
    console.log('4. Asserting new GWA Framework metrics exist...');
    assert.ok(stats.gwa, 'GWA metrics wrapper is missing in response payload!');
    assert.ok(stats.gwa.growth, 'GWA Growth (G) metrics sub-node missing');
    assert.ok(stats.gwa.watch, 'GWA Watch (W) metrics sub-node missing');
    assert.ok(stats.gwa.aware, 'GWA Aware (A) metrics sub-node missing');

    // 5. Verify GWA Growth details
    console.log('5. Validating GWA Growth metrics values...');
    const growth = stats.gwa.growth;
    assert.strictEqual(typeof growth.mau, 'number', 'Growth MAU should be a number');
    assert.ok(growth.mau >= 0, 'Growth MAU should be non-negative');
    assert.strictEqual(typeof growth.dau, 'number', 'Growth DAU should be a number');
    assert.ok(growth.dau >= 0, 'Growth DAU should be non-negative');
    assert.strictEqual(typeof growth.teamCompletionRate, 'number', 'Growth teamCompletionRate should be a number');
    assert.ok(growth.teamCompletionRate >= 0 && growth.teamCompletionRate <= 100, 'Growth teamCompletionRate should be a percentage between 0 and 100');
    assert.strictEqual(typeof growth.activeCompetitions, 'number', 'Growth activeCompetitions should be a number');
    assert.ok(growth.activeCompetitions >= 0, 'Growth activeCompetitions should be non-negative');
    console.log(`   ✅ Growth metrics verified: MAU=${growth.mau}, DAU=${growth.dau}, TeamCompletion=${growth.teamCompletionRate}%, ActiveComps=${growth.activeCompetitions}`);

    // 6. Verify GWA Watch details
    console.log('6. Validating GWA Watch metrics values...');
    const watch = stats.gwa.watch;
    assert.strictEqual(typeof watch.avgMatchmakingScore, 'number', 'Watch avgMatchmakingScore should be a number');
    assert.ok(watch.avgMatchmakingScore >= 60 && watch.avgMatchmakingScore <= 99, 'Watch avgMatchmakingScore should be between 60 and 99');
    assert.strictEqual(typeof watch.atsConversionRate, 'number', 'Watch atsConversionRate should be a number');
    assert.ok(watch.atsConversionRate >= 0 && watch.atsConversionRate <= 100, 'Watch atsConversionRate should be a percentage between 0 and 100');
    assert.strictEqual(typeof watch.pendingConnections, 'number', 'Watch pendingConnections should be a number');
    assert.ok(watch.pendingConnections >= 0, 'Watch pendingConnections should be non-negative');
    console.log(`   ✅ Watch metrics verified: AvgMatchmaking=${watch.avgMatchmakingScore}%, ATSConversion=${watch.atsConversionRate}%, PendingConnections=${watch.pendingConnections}`);

    // 7. Verify GWA Aware details
    console.log('7. Validating GWA Aware metrics structures and simulated bounds...');
    const aware = stats.gwa.aware;
    assert.strictEqual(typeof aware.apiLatency, 'string', 'Aware apiLatency should be a string');
    assert.ok(/^\d+ms$/.test(aware.apiLatency), `Aware apiLatency format invalid: ${aware.apiLatency}`);
    
    assert.strictEqual(typeof aware.dbConnections, 'string', 'Aware dbConnections should be a string');
    assert.ok(/^\d+\/20$/.test(aware.dbConnections), `Aware dbConnections format invalid: ${aware.dbConnections}`);

    assert.strictEqual(typeof aware.verificationSpeed, 'string', 'Aware verificationSpeed should be a string');
    assert.ok(/^\d+m$/.test(aware.verificationSpeed), `Aware verificationSpeed format invalid: ${aware.verificationSpeed}`);

    assert.strictEqual(typeof aware.chatbotLoad, 'string', 'Aware chatbotLoad should be a string');
    assert.ok(/^\d+ thread aktif$/.test(aware.chatbotLoad), `Aware chatbotLoad format invalid: ${aware.chatbotLoad}`);
    console.log(`   ✅ Aware metrics verified: Latency=${aware.apiLatency}, DBConns=${aware.dbConnections}, VerificationSpeed=${aware.verificationSpeed}, ChatbotLoad=${aware.chatbotLoad}`);

    console.log('\n✅ ALL GWA METRICS DASHBOARD INTEGRATION TESTS PASSED SUCCESSFULLY!');

  } catch (err) {
    console.error('\n❌ GWA METRICS INTEGRATION TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

main();
