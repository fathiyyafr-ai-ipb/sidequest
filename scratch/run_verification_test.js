const assert = require('assert');
const http = require('http');

const API_BASE = 'http://localhost:3001/api';

// Helper to execute HTTP requests with Promises
function request(method, path, body = null, token = null, overrideHost = null) {
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
    if (overrideHost) {
      options.headers['Host'] = overrideHost;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        const bodyObj = ct.includes('application/json') ? JSON.parse(data) : data;
        resolve({ status: res.statusCode, body: bodyObj, headers: res.headers });
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
    console.log('=== STARTING E2E INTEGRATION TEST FOR REGISTRATION VERIFICATION SYSTEM ===\n');

    const randomSuffix = Math.floor(Math.random() * 100000);
    const studentLocalEmail = `student_local_${randomSuffix}@ipb.ac.id`;
    const studentProdEmail = `student_prod_${randomSuffix}@ipb.ac.id`;
    const organizerProdEmail = `eo_prod_${randomSuffix}@kemendikbud.go.id`;
    const testPassword = 'password123';

    // ==========================================
    // TEST CASE 1: Student Registration - Localhost Mode
    // ==========================================
    console.log(`[TEST CASE 1] Registering Student in LOCALHOST Mode...`);
    const regLocalRes = await request('POST', '/auth/register', {
      email: studentLocalEmail,
      password: testPassword,
      confirmPassword: testPassword,
      captchaAnswer: 12,
      captchaExpected: 12,
      fullName: 'Budi Localhost',
      role: 'peserta',
      university: 'Institut Pertanian Bogor (IPB)',
      studyProgram: 'Ilmu Komputer',
      semester: 4
    });

    assert.strictEqual(regLocalRes.status, 201, 'Student local registration should succeed');
    assert.strictEqual(regLocalRes.body.isLocalhost, true, 'isLocalhost should be true on localhost');
    assert.strictEqual(regLocalRes.body.verificationToken, null, 'verificationToken should be null on localhost');
    console.log('   ✅ Success: Registered local student.');

    console.log(`[TEST CASE 1] Logging in local student immediately...`);
    const loginLocalRes = await request('POST', '/auth/login', {
      email: studentLocalEmail,
      password: testPassword
    });

    assert.strictEqual(loginLocalRes.status, 200, 'Local student login should succeed immediately without checks');
    assert.ok(loginLocalRes.body.data.accessToken, 'Token should be returned');
    console.log('   ✅ Success: Logged in local student instantly.');

    // ==========================================
    // TEST CASE 2: Student Registration - Production Mode (Simulated via Host header)
    // ==========================================
    console.log(`\n[TEST CASE 2] Registering Student in PRODUCTION Mode...`);
    const regProdRes = await request('POST', '/auth/register', {
      email: studentProdEmail,
      password: testPassword,
      confirmPassword: testPassword,
      captchaAnswer: 10,
      captchaExpected: 10,
      fullName: 'Agus Production',
      role: 'peserta',
      university: 'Universitas Indonesia',
      studyProgram: 'Ilmu Hukum',
      semester: 6
    }, null, 'sidequest.com'); // Force host to 'sidequest.com' to simulate production

    assert.strictEqual(regProdRes.status, 201, 'Student prod registration should succeed');
    assert.strictEqual(regProdRes.body.isLocalhost, false, 'isLocalhost should be false in prod');
    assert.ok(regProdRes.body.verificationToken, 'verificationToken should be generated');
    const studentToken = regProdRes.body.verificationToken;
    console.log(`   ✅ Success: Registered prod student. Token: ${studentToken}`);

    console.log(`[TEST CASE 2] Trying to log in prod student immediately (without email verification)...`);
    const loginProdFailRes = await request('POST', '/auth/login', {
      email: studentProdEmail,
      password: testPassword
    });

    assert.strictEqual(loginProdFailRes.status, 403, 'Login should be blocked with 403');
    assert.strictEqual(loginProdFailRes.body.message, 'Silakan verifikasi email Anda terlebih dahulu.', 'Should block with email verification message');
    console.log('   ✅ Success: Correctly blocked unverified student login.');

    console.log(`[TEST CASE 2] Verifying student email via token...`);
    const verifyStudentRes = await request('GET', `/auth/verify?token=${studentToken}`);
    assert.strictEqual(verifyStudentRes.status, 302, 'Verification should redirect');
    assert.ok(verifyStudentRes.headers.location.includes('verified=true'), 'Should redirect to login with verified flag');
    console.log('   ✅ Success: Email verified. Redirect location:', verifyStudentRes.headers.location);

    console.log(`[TEST CASE 2] Trying to log in prod student again...`);
    const loginProdSuccessRes = await request('POST', '/auth/login', {
      email: studentProdEmail,
      password: testPassword
    });
    assert.strictEqual(loginProdSuccessRes.status, 200, 'Student should be able to login successfully now');
    console.log('   ✅ Success: Logged in verified prod student.');

    // ==========================================
    // TEST CASE 3: Organizer Registration - Production Mode
    // ==========================================
    console.log(`\n[TEST CASE 3] Registering Organizer in PRODUCTION Mode...`);
    const regOrgRes = await request('POST', '/auth/register', {
      email: organizerProdEmail,
      password: testPassword,
      confirmPassword: testPassword,
      captchaAnswer: 15,
      captchaExpected: 15,
      fullName: 'Kepanitiaan UI Hackathon',
      role: 'organizer',
      university: 'Universitas Indonesia BEM', // acts as instansi name
      officeAddress: 'Gedung Pusgiwa UI Lantai 2, Depok',
      phoneNumber: '081234567890'
    }, null, 'sidequest.com'); // Force host to sidequest.com

    assert.strictEqual(regOrgRes.status, 201, 'Organizer prod registration should succeed');
    assert.strictEqual(regOrgRes.body.isLocalhost, false, 'isLocalhost should be false in prod');
    assert.ok(regOrgRes.body.verificationToken, 'verificationToken should be generated');
    const orgToken = regOrgRes.body.verificationToken;
    const orgId = regOrgRes.body.data.user.id;
    console.log(`   ✅ Success: Registered prod organizer. Id: ${orgId}, Token: ${orgToken}`);

    console.log(`[TEST CASE 3] Trying to log in prod organizer immediately (without admin approval)...`);
    const loginOrgFailRes = await request('POST', '/auth/login', {
      email: organizerProdEmail,
      password: testPassword
    });

    assert.strictEqual(loginOrgFailRes.status, 403, 'Login should be blocked with 403');
    assert.strictEqual(loginOrgFailRes.body.message, 'Akun penyelenggara Anda sedang dalam peninjauan oleh operator/superadmin.', 'Should block with pending admin approval message');
    console.log('   ✅ Success: Correctly blocked pending organizer login.');

    console.log(`[TEST CASE 3] Logging in as Superadmin to approve the organizer...`);
    const adminLoginRes = await request('POST', '/auth/login', {
      email: 'superadmin@sidequest.com',
      password: 'password123'
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Superadmin login should succeed');
    const adminToken = adminLoginRes.body.data.accessToken;
    console.log('   ✅ Success: Superadmin logged in.');

    console.log(`[TEST CASE 3] Approving organizer account as Superadmin...`);
    const approveRes = await request('PATCH', `/admin/approve-organizer/${orgId}`, null, adminToken);
    assert.strictEqual(approveRes.status, 200, 'Approve should succeed');
    assert.strictEqual(approveRes.body.data.is_approved, true, 'is_approved should be true in response');
    console.log('   ✅ Success: Organizer account approved by superadmin.');

    console.log(`[TEST CASE 3] Trying to log in organizer again (approved but unverified email)...`);
    const loginOrgFail2Res = await request('POST', '/auth/login', {
      email: organizerProdEmail,
      password: testPassword
    });
    assert.strictEqual(loginOrgFail2Res.status, 403, 'Login should still be blocked with 403');
    assert.strictEqual(loginOrgFail2Res.body.message, 'Silakan verifikasi email Anda terlebih dahulu.', 'Should block with email verification message');
    console.log('   ✅ Success: Correctly blocked approved but unverified organizer.');

    console.log(`[TEST CASE 3] Verifying organizer email via token...`);
    const verifyOrgRes = await request('GET', `/auth/verify?token=${orgToken}`);
    assert.strictEqual(verifyOrgRes.status, 302, 'Verification should redirect');
    assert.ok(verifyOrgRes.headers.location.includes('verified=true'), 'Should redirect to login with verified flag');
    console.log('   ✅ Success: Organizer email verified.');

    console.log(`[TEST CASE 3] Trying to log in verified organizer...`);
    const loginOrgSuccessRes = await request('POST', '/auth/login', {
      email: organizerProdEmail,
      password: testPassword
    });
    assert.strictEqual(loginOrgSuccessRes.status, 200, 'Organizer should be able to login successfully now');
    console.log('   ✅ Success: Logged in fully approved and verified prod organizer.');

    console.log('\n======================================================');
    console.log('✅ ALL VERIFICATION SYSTEM & WORKFLOW INTEGRATION TESTS PASSED!');
    console.log('======================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

main();
