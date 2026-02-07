const User = require('../models/User');
const { sendReferralInvite } = require('../utils/emailService');
const { validateInviteEmails } = require('../utils/referralValidators');

/**
 * POST /api/referrals/invite
 * Send referral invite emails to friends
 */
const sendInvites = async (req, res) => {
  try {
    const { emails } = req.body;
    const user = req.user;

    const validation = validateInviteEmails(emails);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message
      });
    }

    // Ensure user has referralCode (for existing users created before referralCode was added)
    let referralCode = user.referralCode;
    if (!referralCode) {
      const fullUser = await User.findById(user._id);
      if (!fullUser) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }
      if (!fullUser.referralCode) {
        await fullUser.save(); // Triggers pre-save hook to generate referralCode
        referralCode = fullUser.referralCode;
      } else {
        referralCode = fullUser.referralCode;
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const referralLink = `${frontendUrl}/signup?ref=${referralCode}`;

    const inviterName =
      user.firstName || user.fullName || user.email?.split('@')[0] || 'A friend';

    const trimmedEmails = emails.map((e) => e.trim().toLowerCase());

    for (const email of trimmedEmails) {
      const result = await sendReferralInvite(email, referralLink, inviterName);
      if (!result.success) {
        console.error(`Failed to send invite to ${email}:`, result.error);
        const isDev = process.env.NODE_ENV === 'development';
        return res.status(500).json({
          status: 'error',
          message: isDev
            ? `Email send failed: ${result.error}`
            : `Failed to send invite to ${email}. Please try again.`
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Invites sent successfully'
    });
  } catch (error) {
    console.error('Referral invite error:', error);
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
      status: 'error',
      message: isDev && error.message
        ? `Failed to send invites: ${error.message}`
        : 'Failed to send invites. Please try again.'
    });
  }
};

module.exports = {
  sendInvites
};
