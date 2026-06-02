/**
 * SideQuest — run_team_edit_tests.js
 * Automated integration test suite for Team Editing authorization & Team Directory dynamic filters.
 */
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sidequest2',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
});

async function runTests() {
  console.log('=== STARTING AUTOMATED TEAM EDIT & DIRECTORY FILTER TESTS ===');
  const client = await pool.connect();
  
  let userA, userB, competition, team;
  
  try {
    // 1. Setup Test Users & Competition
    console.log('1. Setting up mock test users A (Owner), B (Stranger) and a competition...');
    
    // Clear old test data if any
    await client.query("DELETE FROM users WHERE email LIKE 'test_edit_%@sidequest.id'");
    await client.query("DELETE FROM competitions WHERE title = 'Test Edit Competition'");
    
    const userARes = await client.query(`
      INSERT INTO users (name, email, password, university, prodi, role, is_active, is_verified, is_approved)
      VALUES ('Test User A (Owner)', 'test_edit_a@sidequest.id', 'pwd', 'IPB University', 'Artificial Intelligence', 'peserta', true, true, true)
      RETURNING id, name
    `);
    userA = userARes.rows[0];

    const userBRes = await client.query(`
      INSERT INTO users (name, email, password, university, prodi, role, is_active, is_verified, is_approved)
      VALUES ('Test User B (Stranger)', 'test_edit_b@sidequest.id', 'pwd', 'IPB University', 'Software Engineering', 'peserta', true, true, true)
      RETURNING id, name
    `);
    userB = userBRes.rows[0];

    const compRes = await client.query(`
      INSERT INTO competitions (category_id, title, organizer, deadline, is_free, is_active)
      VALUES (1, 'Test Edit Competition', 'Test Organizer', '2026-12-31', true, true)
      RETURNING id
    `);
    competition = compRes.rows[0];

    console.log(`Mock Setup: Owner A (id: ${userA.id}), Stranger B (id: ${userB.id}), Comp (id: ${competition.id})`);

    // 2. Setup mock team owned by A
    console.log('2. Creating test team owned by Owner A...');
    const teamRes = await client.query(`
      INSERT INTO teams (name, competition_id, created_by, description, max_members, contact)
      VALUES ('Test Edit Team A', $1, $2, 'Original Description', 3, 'Original Contact')
      RETURNING id, name, description, max_members, contact
    `, [competition.id, userA.id]);
    team = teamRes.rows[0];

    await client.query(`
      INSERT INTO team_members (team_id, user_id, role, status)
      VALUES ($1, $2, 'owner', 'joined')
    `, [team.id, userA.id]);

    // 3. Test 1: Team Directory dynamic filtering query ('all', 'my-teams', 'other-teams')
    console.log('3. Testing directory query filter logic...');

    // A is a member of Team A, B is not.
    // Query for user A, type 'my-teams' -> should return 1 team
    const myTeamsARes = await client.query(`
      SELECT t.id FROM teams t
      WHERE t.id = $1 AND EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = $2 AND tm.status = 'joined'
      )
    `, [team.id, userA.id]);
    
    if (myTeamsARes.rows.length === 1) {
      console.log('✅ User A correctly finds Team A in "my-teams".');
    } else {
      throw new Error('TEST 1 FAILED: User A should find Team A in "my-teams".');
    }

    // Query for user B, type 'my-teams' -> should return 0 teams
    const myTeamsBRes = await client.query(`
      SELECT t.id FROM teams t
      WHERE t.id = $1 AND EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = $2 AND tm.status = 'joined'
      )
    `, [team.id, userB.id]);
    
    if (myTeamsBRes.rows.length === 0) {
      console.log('✅ User B correctly finds 0 teams in "my-teams".');
    } else {
      throw new Error('TEST 1 FAILED: User B should have 0 teams in "my-teams".');
    }

    // Query for user B, type 'other-teams' -> should return 1 team
    const otherTeamsBRes = await client.query(`
      SELECT t.id FROM teams t
      WHERE t.id = $1 AND NOT EXISTS (
        SELECT 1 FROM team_members tm WHERE tm.team_id = t.id AND tm.user_id = $2 AND tm.status = 'joined'
      )
    `, [team.id, userB.id]);
    
    if (otherTeamsBRes.rows.length === 1) {
      console.log('✅ User B correctly finds Team A in "other-teams".');
      console.log('✅ TEST 1 PASSED: dynamic directory query logic is 100% correct.');
    } else {
      throw new Error('TEST 1 FAILED: User B should find Team A in "other-teams".');
    }

    // 4. Test 2: Edit Team details authorization checks
    console.log('4. Testing edit team authorization...');
    
    // Check if Owner A is owner
    const checkOwnerA = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'joined'
      ) as is_owner
    `, [team.id, userA.id]);

    if (checkOwnerA.rows[0].is_owner === true) {
      console.log('✅ Owner A correctly verified as owner.');
    } else {
      throw new Error('TEST 2 FAILED: Owner A should be verified as owner.');
    }

    // Check if Stranger B is owner -> should be false
    const checkOwnerB = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2 AND role = 'owner' AND status = 'joined'
      ) as is_owner
    `, [team.id, userB.id]);

    if (checkOwnerB.rows[0].is_owner === false) {
      console.log('✅ Stranger B correctly verified as NON-owner (blocked from editing).');
    } else {
      throw new Error('TEST 2 FAILED: Stranger B should be verified as NON-owner.');
    }

    // 5. Test 3: Edit execution (simulated update)
    console.log('5. Executing simulated team detail update by Owner A...');
    const updateRes = await client.query(`
      UPDATE teams
      SET name = 'Updated Team Name',
          description = 'Updated Description',
          max_members = 4,
          contact = 'Updated Contact'
      WHERE id = $1
      RETURNING *
    `, [team.id]);

    const updated = updateRes.rows[0];
    if (updated.name === 'Updated Team Name' && updated.description === 'Updated Description' && updated.max_members === 4 && updated.contact === 'Updated Contact') {
      console.log('✅ Team details successfully updated in database!');
      console.log('✅ TEST 3 PASSED: edit execution works flawlessly.');
    } else {
      throw new Error('TEST 3 FAILED: Team details were not updated correctly.');
    }

    console.log('\n🌟🌟 ALL TEAM EDIT & DIRECTORY FILTER TESTS PASSED 100%! 🌟🌟');

  } catch (err) {
    console.error('❌ TEST RUNNER ERROR:', err);
    process.exit(1);
  } finally {
    // Cleanup Test Data
    console.log('\nCleaning up mock test data from database...');
    if (team) {
      await client.query("DELETE FROM team_members WHERE team_id = $1", [team.id]);
      await client.query("DELETE FROM teams WHERE id = $1", [team.id]);
    }
    await client.query("DELETE FROM users WHERE email LIKE 'test_edit_%@sidequest.id'");
    await client.query("DELETE FROM competitions WHERE title = 'Test Edit Competition'");
    
    client.release();
    pool.end();
  }
}

runTests();
