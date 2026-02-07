const nodemailer = require('nodemailer');

// Email configuration
const createTransporter = () => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    return transporter;
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Booking - OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                        <h2 style="color: #333; margin-bottom: 20px;">🎫 Booking Verification</h2>
                        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                            Thank you for choosing Oggoair! Please use the following OTP code to complete your booking:
                        </p>
                        <div style="background-color: #28a745; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px;">
                            This is an automated message from Oggoair. Please do not reply to this email.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('Error sending OTP email:', error);
        return { success: false, error: error.message };
    }
};

// Send welcome email after successful registration
const sendWelcomeEmail = async (email, fullName, username, password) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to Oggoair - Account Created!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #28a745; margin-bottom: 20px; text-align: center;">🎉 Welcome to Oggoair, ${fullName}!</h2>
                        <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                            Your booking has been confirmed and your account has been automatically created!
                        </p>
                        
                        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #333; margin-bottom: 15px;">Your Login Credentials:</h3>
                            <p style="color: #666; margin: 10px 0;"><strong>Username:</strong> ${username}</p>
                            <p style="color: #666; margin: 10px 0;"><strong>Password:</strong> ${password}</p>
                            <p style="color: #ff6b6b; font-size: 14px; margin-top: 15px;">
                                ⚠️ Please save these credentials and change your password after first login.
                            </p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; margin-top: 20px;">
                            You can now:
                        </p>
                        <ul style="color: #666; font-size: 14px; text-align: left;">
                            <li>View your booking history</li>
                            <li>Make new bookings faster</li>
                            <li>Update your profile information</li>
                            <li>Access all our services</li>
                        </ul>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            Thank you for choosing Oggoair!
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error: error.message };
    }
};

// Send referral invite email
const sendReferralInvite = async (email, referralLink, inviterName = 'A friend') => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "You're invited! Get €10 off",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
                        <h2 style="color: #333; margin-bottom: 20px; text-align: center;">You're Invited!</h2>
                        <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                            Hi there!
                        </p>
                        <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                            <strong>${inviterName}</strong> has invited you to join OGGO Air and get <strong>€10 off</strong> your first booking!
                        </p>
                        <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
                            Sign up now to claim your discount:
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${referralLink}" style="display: inline-block; background-color: #28a745; color: white; font-size: 16px; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px;">
                                Sign Up & Get €10 Off
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            Or copy this link: <a href="${referralLink}" style="color: #28a745;">${referralLink}</a>
                        </p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            This is an invite from OGGO Air. If you didn't expect this email, you can safely ignore it.
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        console.log('Referral invite email sent successfully:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending referral invite email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendOTPEmail,
    sendWelcomeEmail,
    sendReferralInvite
};
