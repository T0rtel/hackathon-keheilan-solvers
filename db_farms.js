let db;

function init(database) {
    db = database;
}

// Insert or update farmer profile
function upsertFarmerProfile(userId, profile, callback) {
    const { age, experience_years, previous_loans_count, repayment_history, equipment_quality } = profile;
    db.run(
        `INSERT INTO farmer_profiles (user_id, age, experience_years, previous_loans_count, repayment_history, equipment_quality)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           age=excluded.age,
           experience_years=excluded.experience_years,
           previous_loans_count=excluded.previous_loans_count,
           repayment_history=excluded.repayment_history,
           equipment_quality=excluded.equipment_quality`,
        [userId, age, experience_years, previous_loans_count, repayment_history, equipment_quality],
        callback
    );
}

// Get farmer profile by user_id
function getFarmerProfile(userId, callback) {
    db.get('SELECT * FROM farmer_profiles WHERE user_id = ?', [userId], callback);
}

module.exports = { init, upsertFarmerProfile, getFarmerProfile };