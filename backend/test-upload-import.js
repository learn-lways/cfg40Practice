require("dotenv").config();
const { handleUploadError } = require("./middleware/upload");

console.log("handleUploadError type:", typeof handleUploadError);
console.log(
  "handleUploadError is function:",
  typeof handleUploadError === "function"
);

if (typeof handleUploadError === "function") {
  console.log("✅ handleUploadError is a valid middleware function");
} else {
  console.log("❌ handleUploadError is not a function");
}
