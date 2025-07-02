let header = `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inquiry RepayKaro</title>
    <style>
        /* Reset styles for email clients */

        .contact {
            padding: 3px;

        }

        .container {
          
            
            animation: slideIn 1.2s ease-out;
            position: relative;
            overflow: hidden;
        }

        /* Slide-in animation for the container */
        @keyframes slideIn {
            0% {
                opacity: 0;
                transform: translateX(-50px);
            }

            100% {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .logo {
            text-align: center;
            margin-bottom: 30px;
        }

        .logo img {
            max-width: 150px;
            border-radius: 12px;
            animation: bounce 1s ease-in-out;
        }

        /* Bounce animation for the logo */
        @keyframes bounce {
            0% {
                transform: scale(0.8);
                opacity: 0;
            }

            50% {
                transform: scale(1.1);
                opacity: 1;
            }

            100% {
                transform: scale(1);
            }
        }

        .content {
            font-size: 16px;
            color: #333;
            text-align: center;
            animation: fadeInContent 1.5s ease-in;
        }

        /* Fade-in animation for content */
        @keyframes fadeInContent {
            0% {
                opacity: 0;
            }

            100% {
                opacity: 1;
            }
        }

        .content p {
            margin: 0 0 15px;
        }

        .highlight {
            color: #506ddf;
            font-weight: bold;
        }

        .icon {
            vertical-align: middle;
            margin-right: 8px;
            width: 20px;
        }

        .btn {
            display: inline-block;
            margin: 25px 0;
            padding: 15px 35px;
            background: linear-gradient(45deg, #506ddf, #041cf6);
            color: #fff !important;
            text-decoration: none !important;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            position: relative;
            overflow: hidden;
            transition: transform 0.3s ease;
            animation: glow 2s infinite ease-in-out;
        }

        /* Glowing button effect */
        @keyframes glow {
            0% {
                box-shadow: 0 0 5px rgba(142, 97, 255, 0.5);
            }

            50% {
                box-shadow: 0 0 20px rgba(126, 97, 255, 0.8), 0 0 30px rgba(255, 111, 97, 0.4);
            }

            100% {
                box-shadow: 0 0 5px rgba(129, 97, 255, 0.5);
            }
        }

        .btn:hover {
            transform: scale(1.05);
        }

        .footer {
            margin-top: 35px;
            font-size: 14px;
            color: #666;
            border-top: 1px solid #e5e5e5;
            padding-top: 20px;
            text-align: center;
            animation: fadeInFooter 2s ease-in;
        }

        /* Fade-in animation for footer */
        @keyframes fadeInFooter {
            0% {
                opacity: 0;
            }

            100% {
                opacity: 1;
            }
        }

        .footer img {
            vertical-align: middle;
            margin-right: 8px;
            width: 16px;
        }

        .contact a {
            color: #506ddf !important;
            text-decoration: none !important;
        }

        .contact a:hover {
            text-decoration: none !important;
        }

        /* Responsive design */
        @media only screen and (max-width: 600px) {
            .container {
                margin: 20px;
                padding: 25px;
            }

            .btn {
                padding: 12px 25px;
                font-size: 14px;
            }

            .logo img {
                max-width: 120px;
            }
        }
    </style>
</head>`;
let footer = `<div class="footer">
            <div>We’re here to help anytime!</div>
            <div class="contact">
                <img src="https://img.icons8.com/ios-filled/16/000000/phone.png" alt="Phone Icon" />
                +91-9876543210   |  
                <a href="mailto:support@repaykaro.com">support@repaykaro.com</a>

            </div>
            <div class="contact">
                <img src="https://img.icons8.com/ios-filled/16/000000/address.png" alt="Address Icon" />
                B-415 & 233 , Pacific Business Park,Ghaziabad, 201010 Uttar Pradesh
            </div>
            <div class="contact">
                <img src="https://img.icons8.com/ios-filled/24/506ddf/instagram.png" alt="instagram Icon" />
                <img src="https://img.icons8.com/ios-filled/24/506ddf/facebook.png" alt="Phone Icon" />
                <img src="https://img.icons8.com/ios-filled/24/506ddf/linkedin.png" alt="Phone Icon" />
                <img src="https://img.icons8.com/ios-filled/24/506ddf/twitter.png" alt="Twitter Icon" />
            </div>
        </div>`;
const verificationMail = async (data) => {
  return `
  ${header}
<body>
    <div class="container">
        <div class="logo">
            <img src="https://truebusinessminds.com/includes/tbm.png" alt="Company Logo" />
        </div>
        <div class="content" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
  <p style="margin-bottom: 16px;">
    <img src="https://img.icons8.com/ios-filled/20/ff6f61/checked.png" alt="Check Icon" style="vertical-align: middle; margin-right: 5px;" />
    Hello <span style="font-weight: 600; color: #ff6f61;">${data.fullName}</span>,
  </p>

  <p style="margin-bottom: 16px;">
    Thank you for your interest in <strong>RepayKaro</strong>. We're excited to have you onboard!
  </p>

  <p style="margin-bottom: 16px;">
    To complete your inquiry and secure your access, please verify your email address by clicking the button below:
  </p>

  <a href="${data.verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ff6f61; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
    Verify Email Now
  </a>

  <p style="margin-top: 16px;">
    Please note: This verification link will expire in <strong>20 minutes</strong>.
  </p>

  <!-- Responsive Table -->
  <div style="margin-top: 30px; overflow-x: auto;">
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #ddd;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Email</th>
          <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Phone</th>
          <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Message</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 12px; border: 1px solid #ddd;">${data.email}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${data.phone}</td>
          <td style="padding: 12px; border: 1px solid #ddd;">${data.message}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <p style="margin-top: 32px;">
    If you did not make this request, you can safely ignore this message.
  </p>

  <p style="margin-top: 16px;">
    Best regards,<br />
    <strong>Team RepayKaro</strong>
  </p>
</div>

  ${footer}
    </div>
</body>

</html>`;
};

module.exports = {
  verificationMail,
};

