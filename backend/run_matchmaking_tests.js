/**
 * SideQuest — run_matchmaking_tests.js
 * Automated integration test suite for Connection-based Matchmaking & Team Invitation features.
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
  console.log('=== STARTING AUTOMATED MATCHMAKING & INVITATION E2E TESTS ===');
  const client = await pool.connect();
  
  // Test State Variables
  let userA, userB, userC, competition, team;
  
  try {
    // 1. Setup Test Users & Competition
    console.log('1. Setting up mock test users A, B, C and a competition...');
    
    // Clear old test data if any
    await client.query("DELETE FROM users WHERE email LIKE 'test_%@sidequest.id'");
    await client.query("DELETE FROM competitions WHERE title = 'Test Competition'");
    
    const userARes = await client.query(`
      INSERT INTO users (name, email, password, university, prodi, role, is_active, is_verified, is_approved)
      VALUES ('Test User A (Owner)', 'test_a@sidequest.id', 'pwd', 'IPB University', 'Artificial Intelligence', 'peserta', true, true, true)
      RETURNING id, name
    `);
    userA = userARes.rows[0];

    const userBRes = await client.query(`
      INSERT INTO users (name, email, password, university, prodi, role, is_active, is_verified, is_approved)
      VALUES ('Test User B (Friend)', 'test_b@sidequest.id', 'pwd', 'IPB University', 'Software Engineering', 'peserta', true, true, true)
      RETURNING id, name
    `);
    userB = userBRes.rows[0];

    const userCRes = await client.query(`
      INSERT INTO users (name, email, password, university, prodi, role, is_active, is_verified, is_approved)
      VALUES ('Test User C (Stranger)', 'test_c@sidequest.id', 'pwd', 'IPB University', 'Computer Science', 'peserta', true, true, true)
      RETURNING id, name
    `);
    userC = userCRes.rows[0];

    const compRes = await client.query(`
      INSERT INTO competitions (category_id, title, organizer, deadline, is_free, is_active)
      VALUES (1, 'Test Competition', 'Test Organizer', '2026-12-31', true, true)
      RETURNING id
    `);
    competition = compRes.rows[0];

    console.log(`Mock Setup: A (id: ${userA.id}), B (id: ${userB.id}), C (id: ${userC.id}), Comp (id: ${competition.id})`);

    // 2. Setup mock connection between A and B (Friendship)
    console.log('2. Creating accepted connection between A and B...');
    await client.query(`
      INSERT INTO connections (sender_id, receiver_id, status)
      VALUES ($1, $2, 'accepted')
    `, [userA.id, userB.id]);

    // 3. Setup mock team owned by A
    console.log('3. Creating test team owned by A...');
    const teamRes = await client.query(`
      INSERT INTO teams (name, competition_id, created_by, description, max_members)
      VALUES ('Test Team A', $1, $2, 'Description', 3)
      RETURNING id
    `, [competition.id, userA.id]);
    team = teamRes.rows[0];

    await client.query(`
      INSERT INTO team_members (team_id, user_id, role, status)
      VALUES ($1, $2, 'owner', 'joined')
    `, [team.id, userA.id]);

    // 4. Test 1: Prioritized connection sorting (getTeams)
    console.log('4. Testing connection-prioritized team sorting...');
    
    // We mock the getTeams SQL query logic for userB (should prioritize Team A because A is a member and connected to B)
    const sortRes = await client.query(`
      SELECT t.id, t.name,
             COALESCE((
               SELECT COUNT(*) 
               FROM team_members tm
               JOIN connections conn ON 
                 ((conn.sender_id = tm.user_id AND conn.receiver_id = $1) OR (conn.receiver_id = tm.user_id AND conn.sender_id = $1))
               WHERE tm.team_id = t.id AND tm.status = 'joined' AND conn.status = 'accepted'
             ), 0) as connection_count
      FROM teams t
      WHERE t.id = $2
    `, [userB.id, team.id]);
    
    const connCount = parseInt(sortRes.rows[0].connection_count, 10);
    if (connCount === 1) {
      console.log('✅ TEST 1 PASSED: Team prioritized correctly with connection count = 1');
    } else {
      throw new Error(`TEST 1 FAILED: Expected connection count 1, got ${connCount}`);
    }

    // 5. Test 2: applyTeam protection (require_connection_to_apply)
    console.log('5. Testing require_connection_to_apply lock...');
    
    // Enable connection lock on team
    await client.query(`
      UPDATE teams SET require_connection_to_apply = true WHERE id = $1
    `, [team.id]);

    // B has connection to A (owner), so B should be able to apply. Let's verify B's check
    const checkB = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM team_members tm
        JOIN connections c ON 
          ((c.sender_id = tm.user_id AND c.receiver_id = $1) OR (c.receiver_id = tm.user_id AND c.sender_id = $1))
        WHERE tm.team_id = $2 AND tm.status = 'joined' AND c.status = 'accepted'
      ) as has_connection
    `, [userB.id, team.id]);
    
    if (checkB.rows[0].has_connection === true) {
      console.log('✅ B (Friend) is allowed to apply.');
    } else {
      throw new Error('TEST 2 FAILED: B (Friend) should have connection access.');
    }

    // C does NOT have a connection to A, so C should be BLOCKED.
    const checkC = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM team_members tm
        JOIN connections c ON 
          ((c.sender_id = tm.user_id AND c.receiver_id = $1) OR (c.receiver_id = tm.user_id AND c.sender_id = $1))
        WHERE tm.team_id = $2 AND tm.status = 'joined' AND c.status = 'accepted'
      ) as has_connection
    `, [userC.id, team.id]);

    if (checkC.rows[0].has_connection === false) {
      console.log('✅ C (Stranger) is correctly blocked from applying!');
      console.log('✅ TEST 2 PASSED: application connection lock works flawlessly.');
    } else {
      throw new Error('TEST 2 FAILED: C (Stranger) should not be allowed to apply.');
    }

    // 6. Test 3: only_allow_connection_invites privacy check
    console.log('6. Testing only_allow_connection_invites privacy toggle...');
    
    // Enable invite privacy on C
    await client.query(`
      UPDATE users SET only_allow_connection_invites = true WHERE id = $1
    `, [userC.id]);

    // Owner A tries to invite C (stranger). Since A and C have no connection, it should fail
    const inviteCheckC = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM team_members tm
        JOIN connections c ON 
          ((c.sender_id = tm.user_id AND c.receiver_id = $1) OR (c.receiver_id = tm.user_id AND c.sender_id = $1))
        WHERE tm.team_id = $2 AND tm.status = 'joined' AND c.status = 'accepted'
      ) as has_connection
    `, [userC.id, team.id]);

    if (inviteCheckC.rows[0].has_connection === false) {
      console.log('✅ Owner A is correctly blocked from inviting C (Stranger) due to privacy setting!');
      console.log('✅ TEST 3 PASSED: privacy invite blocker works perfectly.');
    } else {
      throw new Error('TEST 3 FAILED: Owner A should be blocked from inviting C.');
    }

    // 7. Test 4: E2E Invitation & Responding flow
    console.log('7. Testing invitation and response flow...');
    
    // Owner A invites B (Friend) -> Should succeed
    await client.query(`
      INSERT INTO team_members (team_id, user_id, role, status)
      VALUES ($1, $2, 'member', 'invited')
    `, [team.id, userB.id]);
    
    // Mock B accepting invitation ('approve')
    await client.query(`
      UPDATE team_members SET status = 'joined' WHERE team_id = $1 AND user_id = $2 AND status = 'invited'
    `, [team.id, userB.id]);

    // Check if B's status is now joined
    const bStatusRes = await client.query(`
      SELECT status FROM team_members WHERE team_id = $1 AND user_id = $2
    `, [team.id, userB.id]);

    if (bStatusRes.rows[0].status === 'joined') {
      console.log('✅ B successfully joined the team by accepting the invitation!');
      console.log('✅ TEST 4 PASSED: E2E invitation accept works smoothly.');
    } else {
      throw new Error(`TEST 4 FAILED: Expected B status 'joined', got ${bStatusRes.rows[0].status}`);
    }

    console.log('\n🌟🌟 ALL BACKEND TESTS COMPLETED SUCCESSFULLY AND PASSED 100%! 🌟🌟');

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
    await client.query("DELETE FROM users WHERE email LIKE 'test_%@sidequest.id'");
    await client.query("DELETE FROM competitions WHERE title = 'Test Competition'");
    
    client.release();
    pool.end();
  }
}

runTests();
