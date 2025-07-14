const User = require('../models/userModel');

function weightedRandomGrade() {
    const weights = {10:1,9:3,8:7,7:10,6:12,5:14,4:12,3:10,2:7,1:4};
    const total = Object.values(weights).reduce((a,b)=>a+b,0);
    let rand = Math.random()*total;
    for (const grade of Object.keys(weights).sort((a,b)=>b-a)) {
        rand -= weights[grade];
        if (rand < 0) return Number(grade);
    }
    return 5;
}

const gradeCard = async (req, res) => {
    const { userId, cardId } = req.body;
    if (!userId || !cardId) {
        return res.status(400).json({ message: 'userId and cardId are required' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const card = user.cards.id(cardId);
        if (!card) return res.status(404).json({ message: 'Card not found' });
        const grade = weightedRandomGrade();
        card.grade = grade;
        card.slabbed = true;
        card.gradedAt = new Date();
        await user.save();
        res.json({ card });
    } catch (err) {
        console.error('Error grading card:', err);
        res.status(500).json({ message: 'Failed to grade card' });
    }
};

module.exports = { gradeCard };
