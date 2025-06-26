// Simple Nodemailer test script
const nodemailer = require("nodemailer");
require("dotenv").config({ path: __dirname + "/.env" });

console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log(
  "GMAIL_APP_PASSWORD:",
  process.env.GMAIL_APP_PASSWORD ? "SET" : "NOT SET"
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const mailOptions = {
  from: process.env.GMAIL_USER,
  to: "saketklhraj@gmail.com",
  subject: "Nodemailer Test - E-commerce Backend",
  text: "This is a test email sent from your e-commerce backend using Nodemailer. If you received this, SMTP is working!\n\n- Team",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Error sending email:", error);
  } else {
    console.log("Email sent:", info.response);
  }
});
