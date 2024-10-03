import crypto from "crypto-js";

const awsRow = process.env.AWS_RAW;

const encrypted = crypto.AES.encrypt(awsRow, "XXXXXX");

console.log(encrypted.toString());
