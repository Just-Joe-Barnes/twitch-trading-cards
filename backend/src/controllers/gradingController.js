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

const finalizeGrade = (card) => {
    const grade = weightedRandomGrade();
    card.grade = grade;
    card.slabbed = true;
    card.gradedAt = new Date();
    // Keep gradingRequestedAt so the frontend knows this card's
    // grade has not been revealed yet. Previously the field was
    // cleared which caused the card to immediately move back to
    // the collection list. Retaining it allows the card to stay
    // in the "grading" section until manually revealed.
};

const startGrading = async (req, res) => {
    const { userId, cardId } = req.body;
    if (!userId || !cardId) {
        return res.status(400).json({ message: 'userId and cardId are required' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const card = user.cards.id(cardId);
        if (!card) return res.status(404).json({ message: 'Card not found' });
        if (card.slabbed) {
            return res.status(400).json({ message: 'Card already graded' });
        }
        card.gradingRequestedAt = new Date();
        await user.save();
        res.json({ card });
    } catch (err) {
        console.error('Error starting grading:', err);
        res.status(500).json({ message: 'Failed to start grading' });
    }
};

const completeGrading = async (req, res) => {
    const { userId, cardId } = req.body;
    if (!userId || !cardId) {
        return res.status(400).json({ message: 'userId and cardId are required' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const card = user.cards.id(cardId);
        if (!card) return res.status(404).json({ message: 'Card not found' });
        if (card.slabbed) {
            return res.status(400).json({ message: 'Card already graded' });
        }
        finalizeGrade(card);
        await user.save();
        res.json({ card });
    } catch (err) {
        console.error('Error completing grading:', err);
        res.status(500).json({ message: 'Failed to complete grading' });
    }
};

module.exports = { startGrading, completeGrading, finalizeGrade };
