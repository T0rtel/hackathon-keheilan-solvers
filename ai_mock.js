async function calculateRisk(farm, farmerProfile) {
    let score = 50;
    if (farmerProfile) {
        if (farmerProfile.repayment_history === 'excellent') score -= 20;
        if (farmerProfile.repayment_history === 'poor') score += 30;
    }
    if (farm.soil_quality === 'excellent') score -= 15;
    if (farm.irrigation === 'none') score += 25;
    score += Math.floor(Math.random() * 10) - 5;
    return Math.max(0, Math.min(100, score));
}

function predictYield(farm) {
    const baseYields = {
        wheat: 2.8,
        dates: 4.2,
        cotton: 1.9,
        rice: 3.5,
        herbs: 1.2
    };
    const base = baseYields[farm.crop_type.toLowerCase()] || 2.0;
    const soilFactor = farm.soil_quality === 'excellent' ? 1.2 : farm.soil_quality === 'poor' ? 0.8 : 1.0;
    const irrigationFactor = farm.irrigation === 'drip' ? 1.1 : 1.0;
    return +(base * soilFactor * irrigationFactor).toFixed(2);
}

function calculateMatchRank(riskScore) {
    if (riskScore < 30) return 1;
    if (riskScore < 60) return 2;
    if (riskScore < 80) return 3;
    return 4;
}

async function analyzeFarm(farmId, db, callback) {
    try {
        const farm = await db.get('SELECT * FROM farms WHERE id = ?', [farmId]);
        if (!farm) return callback(new Error('Farm not found'));

        const profile = await db.get('SELECT * FROM farmer_profiles WHERE user_id = ?', [farm.owner_id]);
        const risk = await calculateRisk(farm, profile || null);
        const yieldTons = predictYield(farm);
        const rank = calculateMatchRank(risk);

        await db.run(
            `INSERT INTO ai_results (farm_id, risk_score, predicted_yield_tons, match_ranking)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(farm_id) DO UPDATE SET
               risk_score=excluded.risk_score,
               predicted_yield_tons=excluded.predicted_yield_tons,
               match_ranking=excluded.match_ranking,
               analysis_date=CURRENT_TIMESTAMP`,
            [farmId, risk, yieldTons, rank]
        );
        db.save();
        callback(null, { risk_score: risk, predicted_yield_tons: yieldTons, match_ranking: rank });
    } catch (err) {
        callback(err);
    }
}

module.exports = { analyzeFarm };